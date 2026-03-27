import { Sun, Moon } from 'lucide-react'
import { BackButton } from '../shared/ui/primitives/BackButton'
import { AccountSidebar } from '../shared/ui/primitives/AccountSidebar'
import { useSiteTheme } from '../shared/context/ThemeContext'

export default function SettingsPage() {
  const { theme, setTheme } = useSiteTheme()

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackButton />
        <div className="flex gap-8 items-start">
          <div className="hidden md:block sticky top-28"><AccountSidebar /></div>
          <div className="flex-1 space-y-6">

            <div className="mb-6">
              <h1 className="text-2xl text-[#f0ede8] font-bold">Aparência</h1>
              <p className="text-sm text-[#6b7280]">Personalize a exibição do site.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-lg text-[#f0ede8] font-bold mb-1">Tema</h2>
              <p className="text-sm text-[#6b7280] mb-5">Escolha entre o tema escuro e o tema claro.</p>

              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-[#d4a843] bg-[#d4a843]/10'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#0a0a0f] border border-white/10 flex items-center justify-center">
                    <Moon className="w-5 h-5 text-[#d4a843]" />
                  </div>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-[#d4a843]' : 'text-[#9ca3af]'}`}>
                    Escuro
                  </span>
                  {theme === 'dark' && (
                    <span className="text-xs text-[#d4a843] font-bold uppercase tracking-widest">Ativo</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    theme === 'light'
                      ? 'border-[#d4a843] bg-[#d4a843]/10'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#f9f9f7] border border-black/10 flex items-center justify-center">
                    <Sun className="w-5 h-5 text-[#8f5f0b]" />
                  </div>
                  <span className={`text-sm font-medium ${theme === 'light' ? 'text-[#d4a843]' : 'text-[#9ca3af]'}`}>
                    Claro
                  </span>
                  {theme === 'light' && (
                    <span className="text-xs text-[#d4a843] font-bold uppercase tracking-widest">Ativo</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
