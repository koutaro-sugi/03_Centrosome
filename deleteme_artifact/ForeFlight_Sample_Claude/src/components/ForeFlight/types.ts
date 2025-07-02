export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  isActive?: boolean;
  variant?: string;
}

export interface SidebarProps {
  menuItems?: MenuItem[];
  activeItemId?: string;
  onItemClick?: (itemId: string) => void;
  width?: number;
  height?: number;
}

export interface MenuItemProps {
  item: MenuItem;
  isActive?: boolean;
  onClick?: () => void;
}