export interface CorporateTag {
  id: string;
  name: string;
  color: string;
}

export const CORPORATE_TAGS: CorporateTag[] = [
  { id: 'academico', name: 'Acadêmico', color: 'purple' },
  { id: 'pessoal', name: 'Pessoal', color: 'green' },
  { id: 'comunidade', name: 'Comunidade', color: 'orange' },
  { id: 'suporte-ti', name: 'Suporte TI', color: 'blue' },
];

export const formatTagName = (tag?: string): string => {
  if (!tag) return '';
  const normalized = tag.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const match = CORPORATE_TAGS.find((t) => {
    const normName = t.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normName === normalized || t.id.toLowerCase() === normalized;
  });
  return match ? match.name : tag;
};

export const TagBadge = ({ tag, size = 'md' }: { tag?: string; size?: 'sm' | 'md' }) => {
  if (!tag) return null;
  const normalized = tag.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const match = CORPORATE_TAGS.find((t) => {
    const normName = t.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normName === normalized || t.id.toLowerCase() === normalized;
  });
  const colorClass = match ? `tag-class-${match.id}` : 'tag-class-default';
  const label = match ? match.name : tag;

  return (
    <span className={`corporate-tag-badge ${colorClass} ${size === 'sm' ? 'tag-badge-sm' : ''}`}>
      <span className="tag-label">{label}</span>
    </span>
  );
};


export interface ComplexityOption {
  id: 'baixa' | 'media' | 'alta';
  label: string;
  colorName: string;
}

export const COMPLEXITY_OPTIONS: ComplexityOption[] = [
  { id: 'baixa', label: 'Baixa', colorName: 'verde' },
  { id: 'media', label: 'Média', colorName: 'amarelo' },
  { id: 'alta', label: 'Alta', colorName: 'vermelho' },
];

export const ComplexityBadge = ({
  complexidade,
  size = 'md',
}: {
  complexidade?: string;
  size?: 'sm' | 'md';
}) => {
  if (!complexidade) return null;
  const lower = complexidade.toLowerCase();
  let colorClass = 'complexity-tag-baixa';
  if (lower.includes('méd') || lower.includes('med')) {
    colorClass = 'complexity-tag-media';
  } else if (lower.includes('alt') || lower.includes('moderado')) {
    colorClass = 'complexity-tag-alta';
  }

  return (
    <span className={`complexity-badge ${colorClass} ${size === 'sm' ? 'complexity-badge-sm' : ''}`}>
      <span className="complexity-badge-dot" />
      <span>{complexidade}</span>
    </span>
  );
};


