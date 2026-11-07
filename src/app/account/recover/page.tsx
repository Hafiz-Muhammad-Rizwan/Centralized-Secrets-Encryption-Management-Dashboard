import AccountForms from '@/components/AccountForms';
export default async function RecoverPage({ searchParams }: { searchParams: Promise<{ token_hash?: string }> }) {
  const { token_hash } = await searchParams;
  const token = typeof token_hash === 'string' && /^[a-f0-9]{40,128}$/i.test(token_hash) ? token_hash : '';
  return <main className="secure-page"><h1>Password recovery</h1><AccountForms mode={token ? 'recover' : 'request'} tokenHash={token} /></main>;
}
