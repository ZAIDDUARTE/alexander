import type { QuestionAnswer, QuestionnaireAnswersV1, SectionId } from "../onboarding/questionnaire-v1/types";
import { getRegistryQuestion } from "../onboarding/questionnaire-v1/registry";

export function getQuestionAnswerRecord(
  answers: QuestionnaireAnswersV1,
  questionId: string,
): QuestionAnswer | undefined {
  const meta = getRegistryQuestion(questionId);
  if (!meta) return undefined;
  if (meta.sectionId === "SUBMISSION") {
    return answers.submission.answers[questionId];
  }
  const sectionId = meta.sectionId as SectionId;
  return answers.sections[sectionId]?.answers[questionId];
}

export function getQuestionAnswerValue(
  answers: QuestionnaireAnswersV1,
  questionId: string,
): unknown | undefined {
  return getQuestionAnswerRecord(answers, questionId)?.value;
}

export function sourcePointerForQuestion(questionId: string): string {
  const meta = getRegistryQuestion(questionId);
  if (!meta) throw new Error(`unknown_question_id:${questionId}`);
  if (meta.sectionId === "SUBMISSION") {
    return `/submission/answers/${questionId}`;
  }
  return `/sections/${meta.sectionId}/answers/${questionId}`;
}
