<script>
  import SeccionVacia from '../ui/SeccionVacia.svelte'
  import { CHAMPIONS } from '../core/champions.js'
</script>

<SeccionVacia
  marca="El foco ⭐"
  titulo="Sistema de Combate"
  descripcion="Un duelo 1v1 ARAM configurable, resuelto con ruletas teatrales que sortean campeones, hechizos, runas y hasta las propias reglas."
  fase="Fase 1"
>
  <p class="dato">{CHAMPIONS.length} campeones listos para la ruleta</p>
</SeccionVacia>

<style>
  .dato {
    margin: 1.4rem 0 0;
    font-size: 0.8rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: rgba(122, 138, 160, 0.7);
  }
</style>
