import { projectSourceEmailThreads } from './research/sourceEmailThreads.js';

// Only the sanitized, CURRENT-author-authorized server reader supplies the bar.
// No client query of private inbound_emails or unrestricted broadcast fallback.
export async function loadNowBarEmail(client) {
  if (!client?.rpc) throw new Error('mail_reader_unavailable');
  const { data, error } = await client.rpc('email_source_threads_v1', { p_limit: 15 });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('invalid_mail_reader_response');
  return projectSourceEmailThreads(data).map(item => ({
    key: item.id, kind: 'mail', who: item.root.author_display,
    text: [item.thread.missing_parent ? 'ההודעה המקורית אינה זמינה' : null,
      ...item.thread.messages.map(message => `${message.author_display}\n${message.text}`)].filter(Boolean).join('\n\n'),
    at: item.thread.last_activity_at,
  }));
}
