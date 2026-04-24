import 'dotenv/config';
import jwt from 'jsonwebtoken';

const USER_ID = 'cmnp0iy8l0000j0vy7acuy5ii';
const WORKSPACE_ID = 'cmo73xto10000q8vyhgj1off4';
const TASK_ID = process.argv[2] ?? 'cmo96vixi002nqcvyzjj0au23';

async function main() {
  const secret = process.env.JWT_ACCESS_SECRET!;
  const token = jwt.sign(
    {
      sub: USER_ID,
      email: 'lojamudialtelhas@gmail.com',
      workspaceId: WORKSPACE_ID,
      role: 'ADMIN',
    },
    secret,
    { expiresIn: '10m' },
  );

  const url = `http://localhost:3001/api/v1/tasks/${TASK_ID}/activities`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  console.log(`[${res.status}] ${url}`);
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
