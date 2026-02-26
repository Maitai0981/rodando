import TwoWheelerIcon from '@mui/icons-material/TwoWheeler'
import SpeedIcon from '@mui/icons-material/Speed'
import BuildIcon from '@mui/icons-material/Build'
import StorefrontIcon from '@mui/icons-material/Storefront'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

import './HeroPaper.css'

export default function HeroPaper() {
  return (
    <section className="hero-paper" aria-label="Apresentacao da Rodando">
      {/* Elementos decorativos de fundo */}
      <div className="hero-decorations" aria-hidden="true">
        <div className="hero-icon hero-icon--1">
          <TwoWheelerIcon />
        </div>
        <div className="hero-icon hero-icon--2">
          <SpeedIcon />
        </div>
        <div className="hero-icon hero-icon--3">
          <BuildIcon />
        </div>
      </div>

      <div className="hero-content">
        {/* Badge de confiança */}
        <div className="hero-badge">
          <span className="hero-badge-icon">★</span>
          <span>Moto Center desde 2008</span>
        </div>

        <h1 className="hero-title" aria-label="Rodando, tudo para voce continuar rodando.">
          <span className="title-line-1">Rodando.</span>
          <span className="title-line-2">
            Tudo para voce{' '}
            <span className="rodando-wheel">
              continuar rodando
              .
            </span>
          </span>
        </h1>

        {/* Subtítulo principal */}
        <p className="hero-subtitle">
          Tudo para voce continuar rodando com mais confianca, performance e atendimento.
        </p>

        {/* Subtítulo secundário */}
        <p className="hero-tagline">
          Peças originais, acessórios e serviços especializados para sua moto
        </p>

        {/* Botões de CTA */}
        <div className="hero-actions">
          <a href="/catalog" className="hero-btn hero-btn--primary">
            <StorefrontIcon />
            <span>Ver Catálogo</span>
            <ArrowForwardIcon className="hero-btn-arrow" />
          </a>
          <a href="/technical" className="hero-btn hero-btn--secondary">
            <SpeedIcon />
            <span>Tabela de Medidas</span>
          </a>
        </div>

        {/* Stats / Números */}
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-number">15+</span>
            <span className="hero-stat-label">Anos de experiência</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-number">5K+</span>
            <span className="hero-stat-label">Clientes atendidos</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-number">50+</span>
            <span className="hero-stat-label">Marcas parceiras</span>
          </div>
        </div>
      </div>
    </section>
  )
}
