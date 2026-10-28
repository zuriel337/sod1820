| run | series | model | pool | est. input tokens | expected | worst case | request sha | lock sha |
|---|---|---|---|---|---|---|---|---|
| B1-sonnet-1 | blind | claude-sonnet-5-5 | real | 51158 | $0.131 | $0.224 | 99f841714249 | a517e5519ebd |
| B1-sonnet-2 | blind | claude-sonnet-5-5 | real | 51158 | $0.131 | $0.224 | 99f841714249 | a517e5519ebd |
| B1-sonnet-3 | blind | claude-sonnet-5-5 | real | 51158 | $0.131 | $0.224 | 99f841714249 | a517e5519ebd |
| B1-haiku-1 | blind | claude-haiku-5-5 | real | 66506 | $0.007 | $0.012 | f3ee7b053fb0 | 06baf75c63f2 |
| B2-sonnet-1 | blind | claude-sonnet-5-5 | real | 51147 | $0.131 | $0.224 | dae1baf6a43d | 6c0b6ae5975a |
| B2-sonnet-2 | blind | claude-sonnet-5-5 | real | 51147 | $0.131 | $0.224 | dae1baf6a43d | 6c0b6ae5975a |
| F-sonnet-1 | blind | claude-sonnet-5-5 | u1 window (EXP-16) | 16921 | $0.097 | $0.181 | 0daf1190e5a5 | 78daa76a759e |
| F-haiku-1 | blind | claude-haiku-5-5 | u1 window (EXP-16) | 21998 | $0.005 | $0.009 | 46697ab7e04e | ca1226079757 |
| B3-sonnet-1 | blind | claude-sonnet-5-5 | t01 | 57838 | $0.138 | $0.232 | d13682eb8ec2 | a2240c7eb5b7 |
| B3-sonnet-2 | blind | claude-sonnet-5-5 | t02 | 51448 | $0.131 | $0.224 | 6d390ddb8cba | 444e64f508fb |
| B3-sonnet-3 | blind | claude-sonnet-5-5 | t03 | 57129 | $0.137 | $0.231 | 4168671042dc | e05a349da173 |
| B3-sonnet-4 | blind | claude-sonnet-5-5 | t04 | 57047 | $0.137 | $0.231 | 833b65669546 | 642abb58866b |
| B3-sonnet-5 | blind | claude-sonnet-5-5 | t05 | 58214 | $0.138 | $0.233 | 56816f43e864 | 3252b426a1f7 |
| B3-sonnet-6 | blind | claude-sonnet-5-5 | t06 | 53037 | $0.133 | $0.226 | 20028bfcda24 | 49ec2b0a9726 |
| B1-fable-1 | blind | claude-fable-5-1 | real | 51158 | $1.131 | $1.520 | 520c38c334de | a594f430cdd3 |
| B2-fable-1 | blind | claude-fable-5-1 | real | 51147 | $1.131 | $1.520 | de964b931ef4 | 5ac3de8acbab |
| D1-sonnet-1 | diagnostic | claude-sonnet-5-5 | real-d1 | 52046 | $0.132 | $0.225 | c8c43efb1f1e | ecfc6d1d4f7c |
| D1-sonnet-2 | diagnostic | claude-sonnet-5-5 | real-d1 | 52046 | $0.132 | $0.225 | c8c43efb1f1e | ecfc6d1d4f7c |
| D1-fable-1 | diagnostic | claude-fable-5-1 | real-d1 | 52046 | $1.135 | $1.525 | d5888db064fb | 7d7fd311a2d3 |
| D2-sonnet-1 | diagnostic | claude-sonnet-5-5 | real | 51289 | $0.131 | $0.224 | c92824b44fb8 | b3b012a9a44c |
| B3-haiku-1 | blind | claude-haiku-5-5 | t07 | 73072 | $0.008 | $0.013 | b4060f9bd32a | 15ba3f45155e |
| B3-haiku-2 | blind | claude-haiku-5-5 | t08 | 73034 | $0.008 | $0.013 | eee1f1bd6d04 | 9854de040a03 |

Runs: 22. Expected total about $5.387 (assumption), worst case if every run used max_tokens $7.965. Pilot cap $8; prior spend $28.72293; remaining of the $40 cap before the pilot $11.27707.
