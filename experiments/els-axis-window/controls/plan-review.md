| run | prompt | cap | window | cells | lines | est. input tokens | expected | worst case | request sha | lock sha |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | v4 | 25 | 23x41 | 943 | 182 | 16469 | $0.832 | $1.703 | 51707c499a27 | e9e5f54640bd |
| C2 | v2-general | 60 | 23x41 | 943 | 182 | 16435 | $0.832 | $1.703 | 59782c95e09d | c9e87b4d634d |
| C3 | v2-general | 25 | 23x41 | 943 | 182 | 16435 | $0.832 | $1.703 | bf11fd473c12 | 2c67e34a2df7 |

Runs: 3. Expected total about $2.496 (assumption), worst case if every run used max_tokens $5.109. Experiment cap $5.2 (stop launching at $4.00); the guard reserves each run's worst case before sending it. Total cap $40, spent before $32.278199.
