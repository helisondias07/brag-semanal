export class AdapterInactiveError extends Error {
  constructor(adapter: string) {
    super(
      `${adapter} está inativo por padrão. Qualquer leitura futura exige allowlist explícita de conta + repositórios/listas, janela de período e política de retenção/destino. Este MVP não pede conta nem faz chamadas de rede.`,
    );
    this.name = "AdapterInactiveError";
  }
}

export class AdapterPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdapterPolicyError";
  }
}
