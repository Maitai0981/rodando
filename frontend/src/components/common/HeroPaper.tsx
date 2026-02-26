import './HeroPaper.css'

export default function HeroPaper() {
  return (
    <section className="hero-paper" aria-label="Apresentacao da Rodando">
      <div className="hero-content">
        <h1 className="hero-title">
          <span className="title-line-1">Rodando.</span>

          <span className="title-line-2">
            Continue{' '}
            <span className="rodando-wheel">
              R
              <Wheel />
              dando
              <Wheel />
              .
            </span>
          </span>
        </h1>

        <p className="hero-subtitle">Engenharia, performance e confianca para manter voce sempre em movimento.</p>
      </div>
    </section>
  )
}

function Wheel() {
  return (
    <span className="wheel" aria-hidden>
      <span className="wheel-inner" />
    </span>
  )
}
