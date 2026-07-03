/**
 * Quick-feedback building blocks (D-009): the star label and the tappable
 * tags shown below the stars. Tags adapt to the rating (praise for high
 * notes, issues for low notes) and to the reviewee's role in the gig.
 */

export const RATING_LABELS: Record<number, string> = {
  1: 'Péssimo',
  2: 'Ruim',
  3: 'Regular',
  4: 'Muito bom',
  5: 'Excelente',
};

const PRAISE_WORKER = ['Pontual', 'Caprichou no serviço', 'Educado e gentil', 'Boa comunicação', 'Rápido'];
const ISSUES_WORKER = ['Atrasou', 'Serviço incompleto', 'Foi mal educado', 'Não apareceu', 'Comunicação ruim'];
const PRAISE_POSTER = ['Local seguro', 'Pagou certinho', 'Educado e gentil', 'Instruções claras', 'Recebeu bem'];
const ISSUES_POSTER = ['Local inseguro', 'Pediu além do combinado', 'Foi mal educado', 'Endereço errado', 'Instruções confusas'];

export function tagsFor(revieweeRole: 'worker' | 'poster', rating: number): string[] {
  const positive = rating >= 4;
  if (revieweeRole === 'worker') return positive ? PRAISE_WORKER : ISSUES_WORKER;
  return positive ? PRAISE_POSTER : ISSUES_POSTER;
}

export function tagsQuestion(rating: number): string {
  return rating >= 4 ? 'O que foi bom? (toque nas opções)' : 'O que deu errado? (toque nas opções)';
}
