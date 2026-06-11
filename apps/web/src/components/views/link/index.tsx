import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { UI } from '@anju/ui';
import { utils } from '@anju/utils';
import { CheckCircleOutlined } from '@mui/icons-material';

import { Wrapper } from './styles';

type Status = 'idle' | 'pending' | 'resolved' | 'rejected';

interface LinkedIdentity {
  id: string;
  provider: string;
  externalId: string;
  displayName: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_or_expired_code:
    'That code is invalid or has expired. Ask your bot for a new one.',
  expired_code: 'That code has expired. Ask your bot for a new one.',
  already_linked_to_other_user:
    'This account is already linked to a different Anju user.'
};

const formatProvider = (provider: string) =>
  provider.charAt(0).toUpperCase() + provider.slice(1);

export const Link = () => {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState<LinkedIdentity | null>(null);

  useEffect(() => {
    const queryCode = router.query.code;
    if (typeof queryCode === 'string' && queryCode.trim()) {
      setCode(queryCode.trim());
    }
  }, [router.query.code]);

  const handleSubmit = async () => {
    if (status === 'pending') return;
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Enter the code from your bot');
      return;
    }

    setStatus('pending');
    setError(null);
    try {
      const data = await utils.fetcher({
        url: '/auth/external/confirm',
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ code: trimmed })
        }
      });

      if (data && data.id) {
        setLinked(data);
        setStatus('resolved');
      } else {
        setStatus('rejected');
        setError(
          ERROR_MESSAGES[data?.error] ||
            'Could not link your account. Please try again.'
        );
      }
    } catch {
      setStatus('rejected');
      setError('Could not link your account. Please try again.');
    }
  };

  return (
    <Wrapper>
      {status === 'resolved' && linked ? (
        <div className="link-card">
          <div className="link-success">
            <CheckCircleOutlined className="link-success-icon" />
            <p className="link-success-title">Account linked</p>
            <p className="link-success-text">
              Your {formatProvider(linked.provider)} account
              {linked.displayName ? ` (${linked.displayName})` : ''} is now
              connected to Anju. You can head back to your bot.
            </p>
          </div>
        </div>
      ) : (
        <div className="link-card">
          <div className="link-header">
            <h1 className="link-title">Link your account</h1>
            <p className="link-subtitle">
              Enter the code your bot gave you to connect it to your Anju
              account.
            </p>
          </div>

          <div className="link-form">
            <UI.Input
              label="Link code"
              name="linkCode"
              placeholder="e.g. G7K9P2QMX4WJ"
              value={code}
              disabled={status === 'pending'}
              error={!!error}
              helperText={error || undefined}
              onChange={e => {
                setCode(e.target.value);
                if (error) setError(null);
              }}
            />
            <UI.Button
              variant="contained"
              disabled={status === 'pending'}
              onClick={handleSubmit}
            >
              {status === 'pending' ? 'Linking...' : 'Link account'}
            </UI.Button>
          </div>
        </div>
      )}
    </Wrapper>
  );
};
