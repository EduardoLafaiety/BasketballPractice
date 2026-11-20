import type { ModoPagamento } from '../../../../contracts/billing'

export default function FormaPagamento({ value, onChange, disabled }: { value: ModoPagamento; onChange: (mode: ModoPagamento) => void; disabled: boolean }) {
  return <fieldset className="compra-formas" disabled={disabled}><legend>Como prefere pagar?</legend>
    <label className={value === 'avulso' ? 'selecionado' : ''}><input type="radio" name="forma" value="avulso" checked={value === 'avulso'} onChange={() => onChange('avulso')} /><span><strong>Pagar pelo período</strong><span>Pix, boleto, débito ou crédito</span><small>Sem renovação automática. Renove quando o período terminar.</small></span></label>
    <label className={value === 'recorrente' ? 'selecionado' : ''}><input type="radio" name="forma" value="recorrente" checked={value === 'recorrente'} onChange={() => onChange('recorrente')} /><span><strong>Assinatura automática</strong><span>Cartão de crédito</span><small>Renova no fim do período. Você pode cancelar as próximas cobranças.</small></span></label>
    <p>Você escolhe o meio de pagamento no Mercado Pago. Pix e cartões dependem da disponibilidade na conta recebedora e da aprovação do provedor.</p>
  </fieldset>
}
