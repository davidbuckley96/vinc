# 01 — Visão Geral do Vinc

## O problema

Pessoas têm horários livres na semana que poderiam ser preenchidos com trabalhos
pontuais ("bicos"), mas não existe um canal simples e confiável para:

- **Quem precisa de um serviço** em um horário específico (ex.: "babá das 15h às
  22h no dia X, por R$ Y") encontrar rapidamente alguém disposto e confiável.
- **Quem quer trabalhar** encontrar serviços compatíveis com os buracos da sua
  agenda semanal e ter a garantia de que vai receber o pagamento.

## A solução

O Vinc é um **marketplace de serviços por horário**, para dispositivos móveis
(iOS/Android) e web, que conecta esses dois lados:

1. **Anunciantes** publicam vagas com categoria, descrição do serviço esperado,
   data, horário e valor.
2. **Prestadores** veem as vagas abertas, e podem aceitar qualquer uma que não
   conflite com sua agenda semanal — **sem processo seletivo**, com poucos cliques.
3. A plataforma intermedia o **pagamento**: o valor fica retido e é liberado ao
   prestador no fim do serviço, de forma que o anunciante tenha segurança de que
   o serviço foi realizado corretamente (modelo Uber/iFood de repasse).

A tela principal é um **calendário** (diário por hora, semanal ou mensal): o
usuário seleciona um horário e, a partir dali, **busca vagas abertas** para
aquele horário ou **cria um anúncio** para ele.

## Confiança é o núcleo do produto

O app envolve estranhos prestando serviços potencialmente na casa de outras
pessoas, além de dinheiro. Por isso:

- **Sistema de avaliações rigoroso** (nota 1–5) nos dois sentidos, agregado em
  todas as categorias, com **total de serviços concluídos** visível no perfil.
  A reputação é o principal ativo do usuário na plataforma.
- **Punição de má-fé dos dois lados**: multa para o anunciante que exclui a vaga
  ou rejeita o prestador após o aceite; penalidades de reputação/prioridade para
  prestadores que cancelam.
- **Sem compensação em dinheiro** para usuários lesados na fase inicial (evita
  exploração do sistema) — o dano é reparado com mecanismos de prioridade,
  a exemplo do que o Uber faz com passageiros que sofrem cancelamento.
- **Denúncias e reembolsos** passam por um processo de análise (aprovado/negado),
  protegendo tanto os usuários quanto a plataforma contra uso indevido.
  ⚠️ Esta é a parte reconhecidamente mais complexa e ainda está em aberto
  (ver `07-duvidas-abertas.md`).

## Princípios do produto

1. **Simplicidade radical.** Usável por pessoas de baixa escolaridade. Poucos
   cliques, linguagem simples, fluxos óbvios. Referências: Uber, iFood,
   Instagram — apps que não teriam sucesso se fossem complexos.
2. **Design minimalista**, no padrão de apps de big techs (ver `04-design.md`).
3. **Confiança acima de crescimento.** Nenhuma feature pode enfraquecer o
   sistema de reputação ou a segurança do pagamento.
4. **Plataforma neutra e sustentável.** A plataforma divulga serviços por
   categorias (saúde, entretenimento, serviços domésticos, etc.) e não assume
   prejuízos para compensar usuários.

## Mercado

- **Brasil** (idioma pt-BR, moeda BRL, Pix como meio de pagamento futuro).
- Multiplataforma: Android, iOS e web com paridade de funcionalidades.
