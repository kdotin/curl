import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme, colors } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 transition-all duration-200 hover:scale-105"
      style={{ 
        color: colors.text
      }}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <i className="ri-contrast-2-line text-xl"></i>
      ) : (
        <i className="ri-contrast-2-fill text-xl"></i>
      )}
    </button>
  );
} 