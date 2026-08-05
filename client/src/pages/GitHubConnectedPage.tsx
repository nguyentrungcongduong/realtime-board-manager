import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Github, CheckCircle2 } from 'lucide-react';

function GitHubConnectedPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['github'] });
    const timer = setTimeout(() => {
      navigate('/boards');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate, queryClient]);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Github className="w-6 h-6" /> GitHub Account Connected!
      </h2>
      <p className="text-xs text-slate-400 max-w-sm">
        Your GitHub account has been successfully linked. Redirecting back to your boards...
      </p>
    </div>
  );
}

export default GitHubConnectedPage;
