<script>
  // Placeholder reutilizable para las secciones aún sin construir.
  // Cada vista de la app lo usa mientras llega su fase del ROADMAP.
  let { marca = 'Próximamente', titulo, descripcion, fase, children } = $props()
</script>

<section class="vacia">
  <p class="vacia__marca">{marca}</p>
  <h1 class="vacia__titulo texto-oro">{titulo}</h1>
  <p class="vacia__desc">{descripcion}</p>
  {#if fase}<span class="vacia__fase">{fase}</span>{/if}
  {@render children?.()}
</section>

<style>
  .vacia {
    text-align: center;
    max-width: 44rem;
    margin: 0 auto;
  }
  .vacia__marca {
    margin: 0 0 1rem;
    padding-left: 0.5em;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.5em;
    text-transform: uppercase;
    color: var(--arcano);
  }
  .vacia__titulo {
    margin: 0;
    font-family: var(--fuente-display);
    font-weight: 900;
    font-size: clamp(2rem, 6vw, 3.4rem);
    line-height: 1.02;
    letter-spacing: 0.02em;
  }
  .vacia__desc {
    margin: 1.1rem auto 1.6rem;
    max-width: 48ch;
    color: var(--humo);
    line-height: 1.65;
    font-size: clamp(0.95rem, 1.6vw, 1.05rem);
  }
  .vacia__fase {
    display: inline-block;
    padding: 0.35rem 0.95rem;
    border: 1px solid var(--borde-oro);
    border-radius: 999px;
    font-size: 0.72rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--oro);
  }
</style>
