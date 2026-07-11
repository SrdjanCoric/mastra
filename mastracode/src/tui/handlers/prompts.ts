/**
 * Event handlers for interactive prompt events:
 * tool_suspended (ask_user / request_access / submit_plan).
 */
import type { AskUserSelectionMode } from '@mastra/core/tools';
import { shouldShowDiff } from '../../utils/plan-diff.js';
import { approvePlanFile, readPlanFile, resolvePlanPath } from '../../utils/plans.js';
import { AskQuestionDialogComponent } from '../components/ask-question-dialog.js';
import { AskQuestionInlineComponent } from '../components/ask-question-inline.js';
import { PlanApprovalInlineComponent } from '../components/plan-approval-inline.js';
import { showModalOverlay } from '../overlay.js';
import type { TUIState } from '../state.js';
import { theme } from '../theme.js';

import type { EventHandlerContext } from './types.js';

/**
 * Process the next pending inline question from the queue.
 * Called when the current active question is resolved (submitted or cancelled).
 */
function processNextInlineQuestion(state: TUIState): void {
  const next = state.pendingInlineQuestions.shift();
  if (next) {
    next();
  }
}

function redactPromptText(value: string, limit: number): string {
  return value
    .replace(/\b(token|secret|password|api[_ -]?key)\s*[:=]\s*\S+/gi, '$1: [redacted]')
    .trim()
    .slice(0, limit);
}

function redactPath(value: string): string {
  const home = process.env.HOME;
  const redacted = home && value.startsWith(home) ? `~${value.slice(home.length)}` : value;
  return redactPromptText(redacted, 500);
}

function formatQuestionSummary(question: string, options?: Array<{ label: string; description?: string }>): string {
  const safeQuestion = redactPromptText(question, 1_500) || 'Input requested.';
  const labels = options
    ?.map(option => redactPromptText(option.label, 100))
    .filter(Boolean)
    .slice(0, 12);
  return labels?.length ? `${safeQuestion}\nOptions: ${labels.join(', ')}` : safeQuestion;
}

/**
 * Handle an ask_question event from the ask_user tool.
 * Shows a dialog overlay and resolves the tool's pending promise.
 *
 * If another inline question is already active, the new question is queued
 * and will be shown once the current one is answered.
 */
export async function handleAskQuestion(
  ctx: EventHandlerContext,
  toolCallId: string,
  question: string,
  options?: Array<{ label: string; description?: string }>,
  selectionMode?: AskUserSelectionMode,
): Promise<void> {
  const { state } = ctx;

  return new Promise(resolve => {
    let settled = false;
    let questionComponent: AskQuestionInlineComponent | undefined;
    let promptHandle: ReturnType<NonNullable<typeof state.interactivePromptBridge>['present']> | undefined;

    const complete = (resumeData: string | string[], source: 'terminal' | 'telegram') => {
      if (settled) return;
      settled = true;
      if (source === 'telegram' && questionComponent) {
        questionComponent.answer(Array.isArray(resumeData) ? resumeData.join(', ') : resumeData);
      }
      state.activeInlineQuestion = undefined;
      state.ui.hideOverlay?.();
      void state.session.respondToToolSuspension({ toolCallId, resumeData });
      resolve();
      processNextInlineQuestion(state);
      state.ui.requestRender();
    };

    const cancel = () => complete('(skipped)', 'telegram');
    const resolveLocal = (resumeData: string | string[]) => {
      if (!promptHandle) {
        complete(resumeData, 'terminal');
        return;
      }
      promptHandle.resolveLocal(
        Array.isArray(resumeData) ? { type: 'answers', answers: resumeData } : { type: 'answer', text: resumeData },
      );
    };

    const present = () => {
      promptHandle = state.interactivePromptBridge?.present({
        kind: 'question',
        title: 'MastraCode question',
        summary: formatQuestionSummary(question, options),
        onResolve: (response, source) => {
          if (response.type === 'answer') {
            const resumeData =
              selectionMode === 'multi_select'
                ? response.text
                    .split(',')
                    .map(value => value.trim())
                    .filter(Boolean)
                : response.text;
            complete(resumeData, source);
          } else if (response.type === 'answers') {
            complete(response.answers, source);
          }
        },
        onCancel: cancel,
      });
    };

    if (state.options.inlineQuestions) {
      const askUserComponent = state.pendingAskUserComponents?.get(toolCallId) ?? state.lastAskUserComponent;
      state.pendingAskUserComponents?.delete(toolCallId);

      const activate = () => {
        try {
          const componentOptions = {
            question,
            options,
            selectionMode,
            multiline: true,
            tui: state.ui,
            onSubmit: (answer: string) => resolveLocal(answer),
            onSubmitMulti: (answers: string[]) => resolveLocal(answers),
            onCancel: () => resolveLocal('(skipped)'),
          };
          if (askUserComponent) {
            askUserComponent.activate(componentOptions);
            questionComponent = askUserComponent;
          } else {
            questionComponent = new AskQuestionInlineComponent(componentOptions, state.ui);
            state.chatContainer.addChild(questionComponent);
          }

          state.activeInlineQuestion = questionComponent;
          state.ui.requestRender();
          state.chatContainer.invalidate();
          questionComponent.focused = true;
          present();
        } catch {
          complete('(skipped)', 'terminal');
        }
      };

      if (state.activeInlineQuestion) state.pendingInlineQuestions.push(activate);
      else activate();
    } else {
      const dialog = new AskQuestionDialogComponent({
        question,
        options,
        selectionMode,
        multiline: true,
        tui: state.ui,
        onSubmit: answer => resolveLocal(answer),
        onSubmitMulti: answers => resolveLocal(answers),
        onCancel: () => resolveLocal('(skipped)'),
      });
      showModalOverlay(state.ui, dialog, { widthPercent: 0.7 });
      dialog.focused = true;
      present();
    }

    ctx.notify('ask_question', question);
  });
}

/**
 * Handle a sandbox_access_request event from the request_access tool.
 * Shows an inline prompt for the user to approve or deny directory access.
 *
 * If another inline question is already active, the new prompt is queued
 * and will be shown once the current one is answered.
 */
export async function handleSandboxAccessRequest(
  ctx: EventHandlerContext,
  toolCallId: string,
  requestedPath: string,
  reason: string,
): Promise<void> {
  const { state } = ctx;
  return new Promise(resolve => {
    let settled = false;
    let promptHandle: ReturnType<NonNullable<typeof state.interactivePromptBridge>['present']> | undefined;
    let questionComponent: AskQuestionInlineComponent;

    const firePermissionResult = (decision: 'approved' | 'declined' | 'dismissed') => {
      state.hookManager
        ?.runPermissionResult('sandbox_access', toolCallId, 'request_access', decision, { path: requestedPath, reason })
        .catch(() => {});
    };
    const complete = (
      approved: boolean,
      source: 'terminal' | 'telegram',
      hookDecision: 'approved' | 'declined' | 'dismissed',
    ) => {
      if (settled) return;
      settled = true;
      const answer = approved ? 'Yes' : 'No';
      if (source === 'telegram') questionComponent.answer(answer, !approved);
      state.activeInlineQuestion = undefined;
      firePermissionResult(hookDecision);
      void state.session.respondToToolSuspension({ toolCallId, resumeData: answer });
      resolve();
      processNextInlineQuestion(state);
      state.ui.requestRender();
    };
    const resolveLocal = (approved: boolean) => {
      if (!promptHandle) {
        complete(approved, 'terminal', approved ? 'approved' : 'declined');
        return;
      }
      promptHandle.resolveLocal({ type: approved ? 'approve' : 'deny' });
    };

    const activate = () => {
      questionComponent = new AskQuestionInlineComponent(
        {
          question: `Grant sandbox access to "${requestedPath}"?\n${theme.fg('dim', `Reason: ${reason}`)}`,
          options: [
            { label: 'Yes', description: 'Allow access to this directory' },
            { label: 'No', description: 'Deny access' },
          ],
          onSubmit: answer => resolveLocal(answer.toLowerCase().startsWith('y')),
          onCancel: () => resolveLocal(false),
          formatResult: answer => {
            const approved = answer.toLowerCase().startsWith('y');
            return approved ? `Granted access to ${requestedPath}` : `Denied access to ${requestedPath}`;
          },
          isNegativeAnswer: answer => !answer.toLowerCase().startsWith('y'),
        },
        state.ui,
      );

      state.activeInlineQuestion = questionComponent;
      state.chatContainer.addChild(questionComponent);
      questionComponent.focused = true;
      state.ui.requestRender();
      state.chatContainer.invalidate();
      promptHandle = state.interactivePromptBridge?.present({
        kind: 'approval',
        title: 'Sandbox access approval',
        summary: `Action: grant directory access\nPath: ${redactPath(requestedPath)}\nReason: ${redactPromptText(reason, 500) || 'Not provided'}`,
        onResolve: (response, source) => {
          if (response.type === 'approve' || response.type === 'deny') {
            complete(response.type === 'approve', source, response.type === 'approve' ? 'approved' : 'declined');
          }
        },
        onCancel: () => complete(false, 'telegram', 'dismissed'),
      });
    };

    if (state.activeInlineQuestion) state.pendingInlineQuestions.push(activate);
    else activate();

    ctx.notify('sandbox_access', `Sandbox access requested: ${requestedPath}`);
  });
}

/**
 * Handle a suspended submit_plan tool call.
 * Shows the plan inline with Approve/Use as Goal/Request Changes options.
 *
 * On each submission the plan is saved to a `.md` file and the previous plan
 * content is snapshotted so that resubmissions can show a diff.
 *
 * "Request changes" rejects the tool call and aborts the agent so the user can
 * provide revision feedback via a normal chat message.
 */
async function approvePlan(
  ctx: EventHandlerContext,
  toolCallId: string,
  title: string,
  plan: string,
  planPath: string | undefined,
  submittedPath: string,
): Promise<void> {
  const { state } = ctx;
  await state.session.state.set({
    activePlan: {
      title,
      plan,
      approvedAt: new Date().toISOString(),
    },
  });

  // Archive the approved plan to the global plans dir so it's findable later. The
  // local plan file is left in place so the user can review every plan made.
  if (planPath) {
    await approvePlanFile({
      planPath,
      title,
      resourceId: state.session.identity.getResourceId(),
    }).catch(() => {});
  }

  // Reset in-memory diff state so the next plan doesn't diff against this one.
  state.previousPlanSnapshot = undefined;
  state.lastSubmitPlanComponent = undefined;

  await state.session.respondToToolSuspension({
    toolCallId,
    resumeData: { action: 'approved', path: submittedPath, title, plan },
  });
}

function formatPlanGoalObjective(title: string, plan: string): string {
  return `# ${title}\n\n${plan}`;
}

export async function handlePlanApproval(
  ctx: EventHandlerContext,
  toolCallId: string,
  submittedPath: string,
): Promise<void> {
  const { state } = ctx;

  // submit_plan carries the plan file path. The agent can write the plan anywhere it
  // has access, so read whatever path it submitted (resolved relative to the project)
  // and parse the `# heading` as the title.
  const projectPath = (state.session.state.get() as any)?.projectPath as string | undefined;
  const planPath = submittedPath ? resolvePlanPath(projectPath ?? process.cwd(), submittedPath) : undefined;
  const current = planPath ? await readPlanFile(planPath) : undefined;
  if (!current) {
    state.previousPlanSnapshot = undefined;
  }

  // Surface a clear error in the approval card when the plan file can't be read,
  // instead of rendering an empty plan.
  const plan =
    current?.plan ??
    `⚠️ Could not read the plan file at \`${submittedPath}\`. Make sure it exists before submitting it.`;
  const resolvedTitle = current?.title || 'Implementation Plan';
  // Snapshot history is keyed by the submitted path so a revision of the same file
  // diffs against the prior submission, but a brand-new file renders in full.
  const snapshotKey = submittedPath;

  // A previous snapshot is only a valid diff base for a revision of the SAME
  // plan file. A different path means a brand-new plan, so render it in full
  // rather than diffing against an unrelated plan.
  const snapshot = state.previousPlanSnapshot;
  const snapshotPlan = snapshot && snapshot.path === snapshotKey ? snapshot.plan : undefined;
  const previousPlan = snapshotPlan && shouldShowDiff(snapshotPlan, plan) ? snapshotPlan : undefined;

  // Snapshot this submission (keyed by submitted path) so the next resubmission of
  // the same file can diff against it. Skip seeding history when the file
  // couldn't be read.
  if (current) {
    state.previousPlanSnapshot = { path: snapshotKey, plan };
  }

  return new Promise(resolve => {
    const planFilename = snapshotKey;
    let settled = false;
    let approvalComponent: PlanApprovalInlineComponent;
    let promptHandle: ReturnType<NonNullable<typeof state.interactivePromptBridge>['present']> | undefined;

    const firePermissionResult = (decision: 'approved' | 'declined') => {
      state.hookManager
        ?.runPermissionResult('plan_approval', toolCallId, 'submit_plan', decision, { path: snapshotKey })
        .catch(() => {});
    };
    const completeApproval = async (source: 'terminal' | 'telegram', startAsGoal: boolean) => {
      if (settled) return;
      settled = true;
      if (source === 'telegram') approvalComponent.resolveExternally(true);
      state.activeInlinePlanApproval = undefined;
      state.ui.setFocus(state.editor);
      firePermissionResult('approved');
      await approvePlan(ctx, toolCallId, resolvedTitle, plan, planPath, snapshotKey);

      if (startAsGoal) {
        const objective = formatPlanGoalObjective(resolvedTitle, plan);
        await ctx.startGoal(objective, 'Goal cancelled.');
        const goal = state.goalManager.getGoal();
        if (goal?.id) state.planStartedGoalId = goal.id;
      }
      resolve();
      state.ui.requestRender();
    };
    const completeRejection = (source: 'terminal' | 'telegram') => {
      if (settled) return;
      settled = true;
      if (source === 'telegram') approvalComponent.resolveExternally(false);
      state.activeInlinePlanApproval = undefined;
      state.ui.setFocus(state.editor);
      firePermissionResult('declined');
      void (async () => {
        try {
          await state.session.respondToToolSuspension({
            toolCallId,
            resumeData: { action: 'rejected', path: snapshotKey, title: resolvedTitle, plan },
          });
        } finally {
          state.planRejectionAbort = true;
          state.session.abort();
        }
      })();
      resolve();
      state.ui.requestRender();
    };
    const resolveLocal = (response: 'approve' | 'goal' | 'deny') => {
      if (!promptHandle) {
        if (response === 'deny') completeRejection('terminal');
        else void completeApproval('terminal', response === 'goal');
        return;
      }
      promptHandle.resolveLocal({ type: response });
    };

    const approvalOptions = {
      toolCallId,
      title: resolvedTitle,
      plan,
      planFilename,
      previousPlan,
      onApprove: () => resolveLocal('approve'),
      onGoal: () => resolveLocal('goal'),
      onReject: () => resolveLocal('deny'),
    };

    approvalComponent =
      state.lastSubmitPlanComponent instanceof PlanApprovalInlineComponent
        ? state.lastSubmitPlanComponent
        : new PlanApprovalInlineComponent(approvalOptions, state.ui);
    approvalComponent.activate(approvalOptions);
    state.activeInlinePlanApproval = approvalComponent;

    if (state.lastSubmitPlanComponent) {
      const children = [...state.chatContainer.children];
      const submitPlanIndex = children.indexOf(state.lastSubmitPlanComponent as any);
      if (submitPlanIndex >= 0) {
        state.chatContainer.clear();
        for (let i = 0; i <= submitPlanIndex; i++) state.chatContainer.addChild(children[i]!);
        if (state.lastSubmitPlanComponent !== approvalComponent) state.chatContainer.addChild(approvalComponent);
        for (let i = submitPlanIndex + 1; i < children.length; i++) state.chatContainer.addChild(children[i]!);
      } else {
        state.chatContainer.addChild(approvalComponent);
      }
    } else {
      state.chatContainer.addChild(approvalComponent);
    }
    state.ui.requestRender();
    state.chatContainer.invalidate();
    state.ui.setFocus(approvalComponent);

    promptHandle = state.interactivePromptBridge?.present({
      kind: 'approval',
      title: 'Plan approval',
      summary: `Action: approve submitted plan\nTitle: ${redactPromptText(resolvedTitle, 300)}\nFile: ${redactPath(planFilename)}`,
      onResolve: (response, source) => {
        if (response.type === 'approve' || response.type === 'goal') {
          return completeApproval(source, response.type === 'goal');
        }
        if (response.type === 'deny') completeRejection(source);
      },
      onCancel: () => completeRejection('telegram'),
    });

    ctx.notify('plan_approval', `Plan "${resolvedTitle}" requires approval`);
  });
}
