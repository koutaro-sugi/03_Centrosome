# UI Design Guidelines

## Color Palette
- **Sidebar**: #1e374f
- **Top Bar**: #32495f  
- **Accent**: #3498db
- **Secondary**: #617185
- **Background**: #f4f5f7
- **Paper/Cards**: #ffffff
- **Error**: #e74c3c
- **Warning**: #f39c12
- **Success**: #27ae60

## Typography Rules
- **Alignment**: Left-center alignment for all content (左中央揃え)
- **Headings**: No line wrapping - expand containers if needed (見出しに折り返し禁止)
- **Font Family**: "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif

## Material-UI Guidelines
- **CRITICAL**: Always use MUI MCP for Material-UI information (MUI MCPを必ず使用)
- **Icons**: Use Material Symbols latest version
- **Components**: Import MUI components individually
- **Theme**: Custom theme with defined color palette

## Layout Patterns
- **Sidebar**: Fixed width 165px, dark theme (#1e374f)
- **Main Content**: Flexible layout with proper spacing
- **Cards**: White background with subtle shadows
- **Navigation**: Highlight active page with accent color (#3498db)

## Responsive Design
- **Mobile**: Hide sidebar on mobile for logbook page
- **Breakpoints**: Use MUI standard breakpoints
- **Touch Targets**: Ensure adequate touch target sizes

## Brand Assets
- **Logo**: Use /logo/Centra.svg for branding
- **Icons**: Hub icon (@mui/icons-material/Hub) for Centrosome
- **Filters**: Apply brightness(0) invert(1) for white SVG conversion