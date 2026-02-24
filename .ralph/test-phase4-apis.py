"""Phase 4 마인드맵 CRUD API 검증 스크립트."""
import json
import urllib.request
import urllib.error

BASE = 'http://127.0.0.1:4950'
session_cookie = None
results = []


def req(method, path, body=None, expect_status=None, headers_extra=None):
    """HTTP 요청 헬퍼."""
    global session_cookie
    url = f'{BASE}{path}'
    data = json.dumps(body, ensure_ascii=False).encode('utf-8') if body else None
    headers = {'Content-Type': 'application/json'}
    if session_cookie:
        headers['Cookie'] = f'mym3_sid={session_cookie}'
    if headers_extra:
        headers.update(headers_extra)
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r)
        body_text = resp.read().decode()
        for h in resp.headers.get_all('Set-Cookie') or []:
            if 'mym3_sid=' in h:
                session_cookie = h.split('mym3_sid=')[1].split(';')[0]
        result = json.loads(body_text) if body_text else {}
        status = resp.status
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        try:
            result = json.loads(body_text) if body_text else {}
        except json.JSONDecodeError:
            result = {'raw': body_text[:200]}
        status = e.code

    ok = True
    if expect_status and status != expect_status:
        ok = False
    return ok, status, result


def test(name, ok, status, result, check_fn=None):
    passed = ok
    if check_fn:
        try:
            passed = passed and check_fn(result)
        except Exception as e:
            passed = False
            print(f'         check_fn 에러: {e}')
    mark = 'PASS' if passed else 'FAIL'
    results.append((name, mark, status))
    print(f'  [{mark}] {name} → {status}')
    if not passed:
        print(f'         응답: {json.dumps(result, ensure_ascii=False)[:300]}')


print('=== Phase 4 마인드맵 CRUD API 검증 ===\n')

# ── 1. 로그인 ──
print('1. POST /api/auth/login')
ok, st, res = req('POST', '/api/auth/login', {'username': 'bril', 'password': '1'}, 200)
test('로그인 성공', ok, st, res, lambda r: r.get('success') and r.get('user', {}).get('username') == 'bril')

# ── 2. 마인드맵 목록 조회 ──
print('\n2. GET /api/mindmap/savelist')
ok, st, res = req('GET', '/api/mindmap/savelist', expect_status=200)
test('savelist 조회', ok, st, res, lambda r: r.get('success') and isinstance(r.get('folders'), list))
folder_count = len(res.get('folders', []))
print(f'   → {folder_count}개 마인드맵')

# ── 3. 마인드맵 저장 ──
test_folder = '__test_phase4__'
test_data = {
    'mindMapData': [
        {
            'id': 1,
            'nodeId': 'TESTROOT001',
            'title': 'Phase4 테스트 루트',
            'parentId': None,
            'level': 0,
            'expanded': True,
            'x': 100, 'y': 100,
            'children': [],
        },
    ],
    'nextNodeId': 2,
    'name': 'Phase4 Test',
}

print(f'\n3. POST /api/mindmap/save ({test_folder})')
ok, st, res = req('POST', '/api/mindmap/save', {'folderName': test_folder, 'data': test_data}, 200)
test('마인드맵 저장', ok, st, res, lambda r: r.get('success'))

# ── 4. 마인드맵 로드 ──
print(f'\n4. GET /api/mindmap/load?folder={test_folder}')
ok, st, res = req('GET', f'/api/mindmap/load?folder={test_folder}', expect_status=200)
test('마인드맵 로드', ok, st, res,
     lambda r: isinstance(r.get('mindMapData'), list) and len(r['mindMapData']) > 0)

if res.get('mindMapData'):
    root = res['mindMapData'][0]
    test('루트 노드 확인', True, st, root,
         lambda r: r.get('title') == 'Phase4 테스트 루트' and r.get('nodeId') == 'TESTROOT001')

# ── 5. PATCH - add ──
print(f'\n5. PATCH /api/mindmap/patch (add)')
ok, st, res = req('PATCH', '/api/mindmap/patch', {
    'folderName': test_folder,
    'operations': [{
        'op': 'add',
        'parentId': 1,
        'node': {
            'title': 'Phase4 자식 노드',
            'content': '<p>Phase4 테스트 콘텐츠</p>',
        },
    }],
}, 200)
test('PATCH add', ok, st, res, lambda r: r.get('success') and r.get('applied', 0) >= 1)

# ── 6. PATCH 후 로드 확인 ──
print(f'\n6. PATCH 후 로드 확인')
ok, st, res = req('GET', f'/api/mindmap/load?folder={test_folder}', expect_status=200)
if res.get('mindMapData'):
    root = res['mindMapData'][0]
    children = root.get('children', [])
    test('자식 노드 추가 확인', True, st, res, lambda r: len(children) >= 1)
    if children:
        child = children[0]
        test('자식 title 확인', True, st, child, lambda r: r.get('title') == 'Phase4 자식 노드')
        child_node_id = child.get('nodeId', '')
        print(f'   → 자식 nodeId: {child_node_id}')
else:
    test('자식 노드 추가 확인', False, st, res)

# ── 7. PATCH - update ──
print(f'\n7. PATCH /api/mindmap/patch (update)')
ok, st, res = req('PATCH', '/api/mindmap/patch', {
    'folderName': test_folder,
    'operations': [{
        'op': 'update',
        'nodeId': 1,
        'changes': {'title': 'Phase4 업데이트된 루트'},
    }],
}, 200)
test('PATCH update', ok, st, res, lambda r: r.get('success') and r.get('applied', 0) >= 1)

# 확인
ok, st, res = req('GET', f'/api/mindmap/load?folder={test_folder}', expect_status=200)
if res.get('mindMapData'):
    root = res['mindMapData'][0]
    test('업데이트 반영 확인', True, st, root, lambda r: r.get('title') == 'Phase4 업데이트된 루트')

# ── 8. savehtml ──
print(f'\n8. POST /api/mindmap/savehtml')
ok, st, res = req('POST', '/api/mindmap/savehtml', {
    'folderName': test_folder,
    'nodeId': 'TESTROOT001',
    'content': '<h1>루트 노드 콘텐츠</h1><p>Phase4 테스트</p>',
}, 200)
test('savehtml', ok, st, res, lambda r: r.get('success'))

# ── 9. 마인드맵 삭제 ──
print(f'\n9. DELETE /api/mindmap/deletefolder?folder={test_folder}')
ok, st, res = req('DELETE', f'/api/mindmap/deletefolder?folder={test_folder}', expect_status=200)
test('마인드맵 삭제', ok, st, res, lambda r: r.get('success'))

# 삭제 확인
ok, st, res = req('GET', f'/api/mindmap/load?folder={test_folder}')
test('삭제 후 404', True, 200, {}, lambda _: st == 404)

# ── 10. 미인증 접근 ──
print(f'\n10. 미인증 접근 테스트')
# 로그아웃
req('POST', '/api/auth/logout')
session_cookie = None

ok, st, res = req('GET', '/api/mindmap/savelist')
test('미인증 savelist → 401', True, 200, {}, lambda _: st == 401)

# ── 요약 ──
print('\n=== 결과 요약 ===')
passed = sum(1 for _, m, _ in results if m == 'PASS')
failed = sum(1 for _, m, _ in results if m == 'FAIL')
print(f'PASS: {passed}/{len(results)}, FAIL: {failed}/{len(results)}')
for name, mark, status in results:
    print(f'  [{mark}] {name}')
