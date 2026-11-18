import { resolve } from 'node:path'
import { analisarArquitetura } from './arquitetura.mjs'

const errors = analisarArquitetura(resolve(import.meta.dirname, '..'))
if (errors.length) { process.stderr.write(errors.join('\n') + '\n'); process.exitCode = 1 }
else process.stdout.write('Arquitetura verificada: fronteiras, imports, contratos e ausência de ciclos de execução no backend.\n')
