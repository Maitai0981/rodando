Compile e rode os testes unitários do backend Java.

Execute:
```
cd "C:/Users/mathe/rodando/backend" && ./mvnw test -q 2>&1 | grep -E "BUILD|Tests run|FAILED|ERROR|Exception" | tail -20
```

Se ./mvnw não funcionar no ambiente atual, use:
```
cd "C:/Users/mathe/rodando/backend" && mvn test -q 2>&1 | grep -E "BUILD|Tests run|FAILED|ERROR" | tail -20
```

Reporte: resultado do build (SUCCESS/FAILURE), número de testes rodados, falhas e erros. Se houver falhas, mostre a classe de teste e a mensagem de erro.
