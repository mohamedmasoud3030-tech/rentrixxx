const required = ['SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing env: ${key}`);
    process.exit(1);
  }
}

const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

async function validate() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/validate`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Supabase validation failed', res.status, text);
    process.exit(1);
  }

  const data = await res.json();
  if (!data?.ok) {
    console.error('Supabase validation failed', data?.issues ?? data);
    process.exit(1);
  }

  console.log('Supabase validation OK');
}

validate().catch((err) => {
  console.error('VALIDATION FAILED: unexpected error', err);
  process.exit(1);
});
