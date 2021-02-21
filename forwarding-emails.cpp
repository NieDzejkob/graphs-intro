#include <iostream>
using namespace std;

int T, N;

int edge[50001];
int counts[50001];

// returns true if in cycle
bool dfs(int n, int t) {
    if (counts[n]) return false;
    counts[n] = -t;
    int e = edge[n];
    if (counts[e] < 0) {
        counts[e] += t + 1;
        counts[n] = counts[e];
        return true;
    } else if (dfs(e, t + 1)) {
        if (counts[n] > 0) {
            return false;
        } else {
            counts[n] = counts[e];
            return true;
        }
    } else {
        counts[n] = counts[e] + 1;
        return false;
    }
}

int main() {
    ios::sync_with_stdio(false); cin.tie();

    cin >> T;
    for (int t = 1; t <= T; t++) {
        cin >> N;
        for (int i = 1; i <= N; i++) {
            int a, b;
            cin >> a >> b;
            edge[a] = b;
            counts[i] = 0;
        }

        int best = 0;
        int bestpos = 0;

        for (int i = 1; i <= N; i++) {
            dfs(i, 1);
            if (counts[i] > best) {
                best = counts[i];
                bestpos = i;
            }
        }

        cout << "Case " << t << ": " << bestpos << "\n";
    }
}
