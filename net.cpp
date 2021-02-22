#include <iostream>
#include <vector>
#include <queue>
using std::cin;
using std::cout;
using std::vector;
using std::queue;
using std::cerr;

vector<vector<int>> edgesTo;

int prev[301];
void bfs(int a) {
    queue<int> q; q.push(a);
    prev[a] = a;
    while (!q.empty()) {
        a = q.front(); q.pop();
        for (int b : edgesTo[a]) {
            if (prev[b]) continue;
            prev[b] = a;
            q.push(b);
        }
    }
}

int main() {
    std::ios::sync_with_stdio(false); cin.tie();
    int n;
    while (cin >> n) {
        cout << "-----\n";
        edgesTo.clear();
        edgesTo.resize(n+1);
        for (int i = 0; i < n; i++) {
            int a; cin >> a;
            char c; cin >> c;
            if (cin.peek() == '\n') continue;
            while(1) {
                int b; cin >> b;
                edgesTo[b].push_back(a);
                if (cin.peek() == ',') cin >> c;
                else break;
            }
        }
        int q; cin >> q;
        while (q--) {
            int a, b; cin >> a >> b;
            for (int i = 0; i <= n; i++) prev[i] = 0;
            bfs(b);
            if (prev[a]) {
                while (a != b) {
                    cout << a << ' ';
                    a = prev[a];
                }
                cout << b << '\n';
            } else {
                cout << "connection impossible\n";
            }
        }
    }
}
