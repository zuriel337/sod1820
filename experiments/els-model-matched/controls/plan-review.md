| run | model | effort | max_tokens | est. input tokens | expected | worst case | input = Fable's | request sha | lock sha |
|---|---|---|---|---|---|---|---|---|---|
| S2.haiku-m | claude-haiku-5-5 | medium | 32000 | 20731 | $0.003 | $0.009 | yes | 82f12e53cca5 | 89851c7d1af4 |
| S2.haiku-h | claude-haiku-5-5 | high | 48000 | 20731 | $0.006 | $0.013 | yes | ae33d703d212 | 658bb80b931a |
| S2.sonnet-m | claude-sonnet-5-5 | medium | 32000 | 20731 | $0.051 | $0.186 | yes | ffc0ab89334f | b619648b419b |
| S2.sonnet-h | claude-sonnet-5-5 | high | 48000 | 20731 | $0.171 | $0.266 | yes | 550ab4b11aa6 | 8760f1f126e5 |
| S4a.haiku-m | claude-haiku-5-5 | medium | 32000 | 20710 | $0.003 | $0.009 | yes | ebceae4d28f7 | 61f228e30142 |
| S4a.haiku-h | claude-haiku-5-5 | high | 48000 | 20710 | $0.006 | $0.013 | yes | bd8355ea388f | 7392fa3cf1d5 |
| S4a.sonnet-m | claude-sonnet-5-5 | medium | 32000 | 20710 | $0.051 | $0.186 | yes | b9bac8cedd20 | e054fe3afe07 |
| S4a.sonnet-h | claude-sonnet-5-5 | high | 48000 | 20710 | $0.171 | $0.266 | yes | a7c35476c59e | 16c5fb2994cb |
| S4b.haiku-m | claude-haiku-5-5 | medium | 32000 | 20662 | $0.003 | $0.009 | yes | 521f1a6dc04f | e2ff1b8d05fe |
| S4b.haiku-h | claude-haiku-5-5 | high | 48000 | 20662 | $0.006 | $0.013 | yes | 3e9ae6e3af0d | 14daf1b3ff7b |
| S4b.sonnet-m | claude-sonnet-5-5 | medium | 32000 | 20662 | $0.051 | $0.186 | yes | 0d478f445149 | 6cfd59c34334 |
| S4b.sonnet-h | claude-sonnet-5-5 | high | 48000 | 20662 | $0.171 | $0.266 | yes | 17e26fb13195 | 85a62de8ab31 |
| V1.haiku-m | claude-haiku-5-5 | medium | 32000 | 20868 | $0.003 | $0.009 | yes | 94f98e5e99e4 | c24d8bf8ed25 |
| V1.haiku-h | claude-haiku-5-5 | high | 48000 | 20868 | $0.006 | $0.013 | yes | 488b54af2aac | efce4db39f34 |
| V1.sonnet-m | claude-sonnet-5-5 | medium | 32000 | 20868 | $0.051 | $0.186 | yes | df888d393368 | ec0e54d7b170 |
| V1.sonnet-h | claude-sonnet-5-5 | high | 48000 | 20868 | $0.171 | $0.266 | yes | 9d9e7aa3ceaa | 41690fd2bd37 |

Runs: 16. Expected total about $0.92 (assumption), worst case if every run used max_tokens $1.898. Experiment cap $1.5 (stop launching at $1.30); the guard reserves each run's worst case before sending it. Total cap $40, spent before $31.548551.
