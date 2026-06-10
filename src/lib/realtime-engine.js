import supabase from './supabase'

export function startFieldEngine(onEvent) {
  const tables = [
    'edges',
    'discoveries',
    'entities',
    'bidim',
    'calculator_anchors',
    'chat_messages'
  ]

  const channel = supabase.channel('field-engine')

  tables.forEach(table => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table
      },
      (payload) => {
        onEvent({
          table,
          ...payload
        })
      }
    )
  })

  channel.subscribe()
}
