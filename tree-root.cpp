#include <iostream>
#include <vector>
#include <tuple>
#include <algorithm>
using namespace std;

vector<vector<int>> children;
int parent[5001];
pair<int, int> highestSubtree[5001];
int upheight[5001];
int N;

void rootify(int a) {
    auto it = find(children[a].begin(), children[a].end(), parent[a]);
    if (it != children[a].end()) {
        children[a].erase(it);
    }

    int h1 = 0, h2 = 0;
    for (int b : children[a]) {
        parent[b] = a;
        rootify(b);
        int hsub = highestSubtree[b].first + 1;
        if (hsub > h1) {
            h2 = h1;
            h1 = hsub;
        } else if (hsub > h2) {
            h2 = hsub;
        }
    }
    highestSubtree[a] = make_pair(h1, h2);
}

void compute_upheight(int a) {
    int h = highestSubtree[a].first + 1;
    if (a != 0) {
        int h1, h2;
        tie(h1, h2) = highestSubtree[parent[a]];
        if (h1 == h) h1 = h2;
        upheight[a] = 1 + max(upheight[parent[a]], h1);
    } else {
        upheight[a] = 0;
    }

    for (int b : children[a]) {
        compute_upheight(b);
    }
}

int height(int a) {
    return max(upheight[a], highestSubtree[a].first);
}

int main() {
    ios::sync_with_stdio(false); cin.tie();

    while (cin >> N) {
        children.clear();
        children.resize(N + 1);
        for (int i = 0; i < N; i++) {
            int count; cin >> count;
            while (count--) {
                int a; cin >> a; a--;
                children[i].push_back(a);
            }
        }

        parent[0] = 0;
        rootify(0);
        compute_upheight(0);

        int m = 1<<30; int M = 0;
        vector<int> best;
        vector<int> worst;
        for (int i = 0; i < N; i++) {
            int h = height(i);
            if (h < m) {
                m = h;
                best.clear();
            }

            if (h == m) {
                best.push_back(i);
            }

            if (h > M) {
                M = h;
                worst.clear();
            }

            if (h == M) {
                worst.push_back(i);
            }
        }

        cout << "Best Roots  :";
        for (int a : best) {
            cout << ' ' << a+1;
        }
        cout << "\nWorst Roots :";
        for (int a : worst) {
            cout << ' ' << a+1;
        }
        cout << '\n';
    }
}
