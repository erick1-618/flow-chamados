export interface CorporateTag {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const CORPORATE_TAGS: CorporateTag[] = [
  { id: 'ti', name: 'TI & Sistemas', icon: '💻', color: 'blue' },
  { id: 'infra', name: 'Infraestrutura', icon: '🌐', color: 'orange' },
  { id: 'acessos', name: 'Acessos & Contas', icon: '🔑', color: 'purple' },
  { id: 'financeiro', name: 'Financeiro', icon: '💳', color: 'green' },
  { id: 'rh', name: 'Recursos Humanos', icon: '👥', color: 'pink' },
  { id: 'geral', name: 'Geral', icon: '📋', color: 'gray' },
];

export const TagBadge = ({ tag, size = 'md' }: { tag?: string; size?: 'sm' | 'md' }) => {
  if (!tag) return null;
  const match = CORPORATE_TAGS.find((t) => t.name.toLowerCase() === tag.toLowerCase());
  const icon = match ? match.icon : '🏷️';
  return (
    <span className={`corporate-tag-badge ${size === 'sm' ? 'tag-badge-sm' : ''}`}>
      <span className="tag-icon">{icon}</span>
      <span className="tag-label">{tag}</span>
    </span>
  );
};

