import {
  ReactNode, SyntheticEvent, useEffect, useState,
} from 'react';
import {
  Alert,
  Button,
  Center,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';

const EMAIL_GATE_STORAGE_KEY = 'intelvia_email_gate_v1';
const EMAIL_GATE_COMPLETED_VALUE = 'true';
let emailGateBypassedForSession = false;

type EmailGateSubmitResponse = { ok: true } | { ok: false; error: string };

function persistGateStorage(): void {
  if (emailGateBypassedForSession) return;

  try {
    localStorage.setItem(EMAIL_GATE_STORAGE_KEY, EMAIL_GATE_COMPLETED_VALUE);
  } catch {
    emailGateBypassedForSession = true;
  }
}

function getCookie(name: string): string | null {
  if (!document.cookie) return null;

  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i += 1) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(`${name}=`)) {
      return decodeURIComponent(cookie.slice(name.length + 1));
    }
  }

  return null;
}

async function getEmailGateCsrfToken(): Promise<string | null> {
  const existingToken = getCookie('csrftoken');
  if (existingToken) {
    return existingToken;
  }

  const csrfResponse = await fetch(`${import.meta.env.VITE_QUERY_URL}email_gate/csrf`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!csrfResponse.ok) {
    return null;
  }

  return getCookie('csrftoken');
}

export function isEmailGateEnabled(hostname: string = window.location.hostname): boolean {
  return hostname === 'intelvia.app' || hostname.endsWith('.intelvia.app');
}

export function isEmailGateBlocked(hostname: string = window.location.hostname): boolean {
  if (!isEmailGateEnabled(hostname)) return false;
  if (emailGateBypassedForSession) return false;

  try {
    return localStorage.getItem(EMAIL_GATE_STORAGE_KEY) !== EMAIL_GATE_COMPLETED_VALUE;
  } catch {
    emailGateBypassedForSession = true;
    return false;
  }
}

async function submitEmailGate(email: string, institution: string): Promise<EmailGateSubmitResponse> {
  try {
    const csrfToken = await getEmailGateCsrfToken();
    if (!csrfToken) {
      return { ok: false, error: 'Unable to submit gate form' };
    }

    const response = await fetch(`${import.meta.env.VITE_QUERY_URL}email_gate/submit`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ email, institution }),
    });

    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'Unable to submit gate form' };
    }

    persistGateStorage();

    return { ok: true };
  } catch {
    return { ok: false, error: 'Unable to submit gate form' };
  }
}

interface EmailGateProps {
  onComplete: () => void;
}

export function EmailGate({ onComplete }: EmailGateProps) {
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedInstitution = institution.trim();

    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

    if (!trimmedInstitution) {
      setError('Institution is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await submitEmailGate(trimmedEmail, trimmedInstitution);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onComplete();
  };

  return (
    <Center h="100vh" px="md">
      <Paper withBorder radius="md" p="xl" w="100%" maw={460}>
        <form onSubmit={onSubmit}>
          <Stack gap="md">
            <Title order={3}>Welcome to Intelvia</Title>
            <Text size="sm" c="dimmed">
              Enter your email and affiliated institution to continue.
            </Text>
            <TextInput
              label="Email"
              type="email"
              placeholder="name@hospital.org"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />
            <TextInput
              label="Institution"
              placeholder="Hospital or Institution Name"
              value={institution}
              onChange={(event) => setInstitution(event.currentTarget.value)}
              required
            />
            {error && <Alert color="red">{error}</Alert>}
            <Button type="submit" loading={submitting}>
              Continue
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}

interface EmailGateBoundaryProps {
  children: ReactNode;
  onBlockedChange?: (blocked: boolean) => void;
}

export function EmailGateBoundary({ children, onBlockedChange }: EmailGateBoundaryProps) {
  const [blocked, setBlocked] = useState(() => isEmailGateBlocked());

  useEffect(() => {
    onBlockedChange?.(blocked);
  }, [blocked, onBlockedChange]);

  if (blocked) {
    return <EmailGate onComplete={() => setBlocked(false)} />;
  }

  return children;
}
