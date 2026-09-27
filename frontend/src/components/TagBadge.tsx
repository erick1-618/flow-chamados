export interface CorporateTag {
  id: string;
  name: string;
  category: string;
  icon: string;
  colorName: string;
  desc: string;
}

export const CORPORATE_TAGS: CorporateTag[] = [
  {
    id: 'ti-sistemas',
    name: 'TI & Sistemas',
    category: 'Tecnologia',
    icon: '💻',
    colorName: 'blue',
    desc: 'Sistemas corporativos, softwares, e-mail e acessos',
  },
  {
    id: 'financeiro-fiscal',
    name: 'Financeiro & Fiscal',
    category: 'Finanças',
    icon: '📊',
    colorName: 'green',
    desc: 'Notas fiscais, faturamento, pagamentos e reembolsos',
  },
  {
    id: 'rh-pessoal',
    name: 'Recursos Humanos',
    category: 'Gente & Gestão',
    icon: '👥',
    colorName: 'purple',
    desc: 'Folha, benefícios, férias, ponto e solicitações de RH',
  },
  {
    id: 'operacoes-logistica',
    name: 'Operações & Logística',
    category: 'Operacional',
    icon: '📦',
    colorName: 'orange',
    desc: 'Estoque, compras internas, remessas e suprimentos',
  },
  {
    id: 'infra-facilities',
    name: 'Infraestrutura & Redes',
    category: 'Facilities & Hardware',
    icon: '🏢',
    colorName: 'red',
    desc: 'Conexão de rede/Wi-Fi, telefonia, impressoras e hardware',
  },
  {
    id: 'duvidas-geral',
    name: 'Dúvidas & Apoio Geral',
    category: 'Geral',
    icon: '📋',
    colorName: 'yellow',
    desc: 'Dúvidas gerais, procedimentos internos e orientações',
  },
];

export const getTagColor = (tagName?: string): string => {
  if (!tagName) return 'slate';
  const tag = CORPORATE_TAGS.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
  return tag ? tag.colorName : 'slate';
};

export const TagBadge = ({ tag, size = 'md' }: { tag?: string; size?: 'sm' | 'md' }) => {
  if (!tag) return null;
  const color = getTagColor(tag);

  return (
    <span className={`tag-badge tag-${color} ${size === 'sm' ? 'tag-badge-sm' : ''}`}>
      <span className="tag-dot" />
      <span>{tag}</span>
    </span>
  );
};
