# Inconsistências identificadas — Aula 06

1. A aula afirma que a validação é o mecanismo “mais crítico” de defesa e a associa diretamente à prevenção de SQL Injection, XSS, NoSQL Injection e buffer overflow. No projeto, Prisma reduz o risco de injeção SQL por parametrização, mas validação de entrada não substitui codificação de saída contra XSS, controle de conteúdo, limites de requisição ou outras defesas. Além disso, buffer overflow não é uma ameaça típica do código JavaScript gerenciado pelo Node.js.

2. A descrição da defesa em profundidade indica que a validação no controller e no service é “nova”, mas a Aula 05 já valida formato, IDs e regras de negócio nos controllers e services. A Aula 06 deve introduzir a centralização com Zod e erros customizados, não sugerir que a aplicação ainda não tem nenhuma validação.

3. O exemplo de resposta de erro inclui `requestId`, mas a prática não cria middleware para gerá-lo nem o inclui nas respostas. O contrato apresentado precisa corresponder ao que será implementado.

4. A lista de classes inclui erros de autenticação e autorização, embora autenticação ainda não faça parte do projeto. Esses tipos podem ser apresentados como extensões futuras, mas não devem compor o escopo de código obrigatório.

5. A prática orienta criar uma branch chamada `feature/validation-error-handling`, diferente do fluxo incremental definido no projeto (`06-feature/validation-error-handling` e `R06-feature/validation-error-handling`).

6. A prática fixa `zod@3.23.8`, uma versão anterior, sem explicar a escolha. O material deve usar a versão atual compatível declarada no `package.json` e a API correspondente.

7. Os schemas e serviços incluem o campo `senha`, mas o model `User` da Aula 05 possui somente `nome`, `email`, `papel` e `foto`. A introdução de `senha` exigiria alteração de schema e um módulo de segurança que não estão no escopo desta aula.

8. A atividade usa `PUT /users/:id`, enquanto a Aula 05 estabeleceu `PATCH /users/:id` para atualização parcial. A Aula 06 deve preservar esse contrato.

9. O middleware de validação contém `console.log('aaaaaa')` e outros logs de depuração, que não devem constar no código didático de produção.

10. O middleware de erro expõe `error.message`, `stack`, metadados do Prisma e detalhes internos quando `NODE_ENV` é `development`. A Aula 05 exige que respostas `500` não exponham mensagens internas; logs podem conter contexto, mas o cliente deve receber uma mensagem segura.

11. O exemplo substitui `src/server.js` por uma aplicação inteira, registra apenas `/users` e chama `listen()` no mesmo arquivo exportado. Isso remove as rotas de `Subject` e `Question` já existentes e contradiz a separação da Aula 05: `app.js` configura/exporta a aplicação e `server.js` apenas a inicia.

12. O handler de rota inexistente responde diretamente em um formato diferente, em vez de encaminhar um `NotFoundError` para o middleware centralizado. Assim, a padronização prometida não vale para todos os erros.

13. Os testes importam `src/server.js`; isso pode iniciar uma porta durante a suíte e contradiz o requisito da Aula 05 de importar `src/app.js`.

14. Os testes criam registros sem uma limpeza completa e reutilizam IDs fixos para cenários inexistentes. Isso conflita com a orientação da Aula 05 para testes independentes, determinísticos e com limpeza apenas dos dados criados.

15. As instruções para a atividade pedem fork, pull request, push e merge na `main`, enquanto o fluxo do projeto usa branches locais incrementais e atividades para `Subject` e `Question`. Essas instruções não correspondem ao escopo pedagógico atual.
