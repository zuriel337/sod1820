| run | group | window | cells | lines | est. input tokens | expected | worst case | request sha | lock sha |
|---|---|---|---|---|---|---|---|---|---|
| C1 | near-axis | 23x41 | 943 | 182 | 16469 | $0.832 | $1.703 | 51707c499a27 | e9e5f54640bd |
| K1 | control | 28x41 | 1148 | 197 | 18725 | $0.844 | $1.717 | 607a1672d18e | 5357fa1ff994 |
| V1X | near-axis | 29x41 | 1189 | 200 | 19183 | $0.846 | $1.720 | 85c4a36f5e9e | badd9fbf1e2d |

Runs: 3. Expected total about $2.522 (assumption), worst case if every run used max_tokens $5.14. Experiment cap $3 (stop launching at $2.50); the guard reserves each run's worst case before sending it. Total cap $40, spent before $32.278199.
