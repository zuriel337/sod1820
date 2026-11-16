def mann_whitney_p(xs, ys):
    """Two-sided Mann-Whitney U p-value, exact by enumeration for small samples (n1*n2 combinations <= 200k), otherwise a tie-corrected normal approximation."""
    import itertools, math
    n1, n2 = len(xs), len(ys)
    if n1 < 3 or n2 < 3: return None
    data = [(v, 0) for v in xs] + [(v, 1) for v in ys]
    order = sorted(range(len(data)), key=lambda i: data[i][0]); ranks = [0.0] * len(data); i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and data[order[j + 1]][0] == data[order[i]][0]: j += 1
        for k in range(i, j + 1): ranks[order[k]] = (i + j) / 2 + 1
        i = j + 1
    u1 = sum(r for r, (_, g) in zip(ranks, data) if g == 0) - n1 * (n1 + 1) / 2
    mean = n1 * n2 / 2
    if math.comb(n1 + n2, n1) <= 200000:
        total = n1 + n2; allranks = ranks; count = 0; extreme = abs(u1 - mean); combos = 0
        for comb in itertools.combinations(range(total), n1):
            u = sum(allranks[k] for k in comb) - n1 * (n1 + 1) / 2
            combos += 1
            if abs(u - mean) >= extreme - 1e-9: count += 1
        return count / combos
    ties = collections.Counter(v for v, _ in data)
    tie_term = sum(t ** 3 - t for t in ties.values()) / ((n1 + n2) * (n1 + n2 - 1))
    var = n1 * n2 / 12 * ((n1 + n2 + 1) - tie_term)
    z = (abs(u1 - mean) - 0.5) / math.sqrt(var) if var > 0 else 0
    return math.erfc(z / math.sqrt(2))

