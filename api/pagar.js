export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { itens, pagador, tipo } = req.body;

    const total = itens.reduce((s, i) => {
      const preco = parseFloat(String(i.preco).replace(/[^\d,]/g, '').replace(',', '.'));
      return s + (isNaN(preco) ? 0 : preco * i.qty);
    }, 0);

    const descricao = itens.map(i => `${i.qty}x ${i.nome}`).join(', ');

    const body = {
      transaction_amount: Math.round(total * 100) / 100,
      description: `Monarca Jowelry - ${descricao}`,
      payment_method_id: tipo === 'pix' ? 'pix' : undefined,
      payer: {
        email: pagador.email,
        first_name: pagador.nome.split(' ')[0],
        last_name: pagador.nome.split(' ').slice(1).join(' ') || 'Cliente',
      }
    };

    if (tipo === 'cartao') {
      body.token = pagador.token;
      body.installments = pagador.parcelas || 1;
      body.payment_method_id = pagador.payment_method_id;
    }

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer APP_USR-6516486788861107-071819-ea6ceb10dd0bedeebca60bd02e438f4d-1905468822`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${Date.now()}-${Math.random()}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data.message || 'Erro no pagamento' });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      pix: data.point_of_interaction?.transaction_data?.qr_code,
      pix_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
      total
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
