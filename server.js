const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Usuários do sistema (pode alterar senhas aqui)
const users = {
  recepcao: { password: 'recepcao123', role: 'recepcao' },
  delivery: { password: 'delivery123', role: 'delivery' },
};

let orders = [];
let orderIdCounter = 1;

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && user.password === password) {
    res.json({ success: true, role: user.role, username });
  } else {
    res.status(401).json({ success: false, message: 'Usuário ou senha incorretos' });
  }
});

io.on('connection', (socket) => {
  socket.emit('orders-update', orders);

  socket.on('add-order', ({ role, orderNumber }) => {
    if (role !== 'recepcao') return;

    const trimmed = String(orderNumber).trim();
    if (!trimmed) return;

    const existing = orders.find(
      (o) => o.orderNumber === trimmed && o.status !== 'entregue'
    );
    if (existing) {
      socket.emit('order-error', `Pedido #${trimmed} já está na fila.`);
      return;
    }

    const order = {
      id: orderIdCounter++,
      orderNumber: trimmed,
      status: 'aguardando',
      createdAt: new Date().toISOString(),
      confirmedAt: null,
      completedAt: null,
    };
    orders.push(order);
    io.emit('orders-update', orders);
    io.emit('new-order-alert', { orderNumber: trimmed });
  });

  socket.on('confirm-order', ({ role, id }) => {
    if (role !== 'delivery') return;
    const order = orders.find((o) => o.id === id);
    if (order && order.status === 'aguardando') {
      order.status = 'em_preparo';
      order.confirmedAt = new Date().toISOString();
      io.emit('orders-update', orders);
    }
  });

  socket.on('complete-order', ({ role, id }) => {
    if (role !== 'recepcao') return;
    const order = orders.find((o) => o.id === id);
    if (order && order.status === 'em_preparo') {
      order.status = 'entregue';
      order.completedAt = new Date().toISOString();
      io.emit('orders-update', orders);
    }
  });

  socket.on('cancel-order', ({ role, id }) => {
    if (role !== 'recepcao') return;
    orders = orders.filter((o) => o.id !== id);
    io.emit('orders-update', orders);
  });
});

function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

function scheduleMidnightReset() {
  setTimeout(() => {
    orders = [];
    orderIdCounter = 1;
    io.emit('orders-update', orders);
    console.log('🗑️  Lista de pedidos limpa à meia-noite.');
    scheduleMidnightReset(); // agenda para a próxima meia-noite
  }, msUntilMidnight());
}

scheduleMidnightReset();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n✅ Servidor rodando na porta ${PORT}\n`);
});
