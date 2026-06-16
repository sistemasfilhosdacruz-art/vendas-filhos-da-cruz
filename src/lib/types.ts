export type ID = string;

export interface Retiro {
  id: ID;
  nome: string;
}

export interface Pessoa {
  id: ID;
  nome: string;
  telefone?: string;
  setor?: string;
  retiroId: ID;
}

export interface Produto {
  id: ID;
  nome: string;
  valor: number;
  fornecedor: string;
  retiroId: ID;
}

export type VendaStatus = "pendente" | "pago";

export interface Venda {
  id: ID;
  pessoaId: ID;
  produtoId: ID;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
  status: VendaStatus;
  retiroId: ID;
  criadoEm: string; // ISO
  // snapshots para relatórios mesmo se produto for editado
  produtoNome: string;
  fornecedor: string;
}

export type NotaStatus = "pendente" | "pago";

export interface NotaFornecedor {
  id: ID;
  retiroId: ID;
  fornecedor: string;
  descricao?: string;
  valor: number;
  status: NotaStatus;
  criadoEm: string; // ISO
}
