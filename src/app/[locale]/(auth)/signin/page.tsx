import BackButton from '@/components/BackButton';
import AuthPanel from '@/components/auth/AuthPanel';

export default function SignInPage(){
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <BackButton />
      <AuthPanel />
    </div>
  );
}
