Faça o build de produção do frontend e reporte erros de TypeScript ou bundle.

Execute em sequência:
1. `cd "C:/Users/mathe/rodando/frontend" && npm run lint 2>&1 | tail -20`
2. `cd "C:/Users/mathe/rodando/frontend" && npm run build 2>&1 | tail -30`

Reporte: erros de lint, erros de TypeScript, warnings relevantes, e o tamanho final do bundle se disponível. Se tudo passar, confirme que o build está pronto para produção.
