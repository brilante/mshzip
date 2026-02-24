/**
 * Authentication Check Script
 * 페이지 로드 시 세션을 확인하고, 인증되지 않은 경우 로그인 페이지로 리다이렉트
 */

(async function checkAuthentication() {
    try {
        // 로그인 페이지인 경우 체크하지 않음
        if (window.location.pathname === '/login') {
            return;
        }

        // 인증 상태 확인 (캐시 완전 우회)
        const response = await fetch('/api/auth/check?_=' + Date.now(), {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

        const data = await response.json();

        if (data.success && data.authenticated) {
            // 인증 성공 - 전역 변수에 사용자 정보 저장
            window.currentUserId = data.user.username;
            window.currentUserEmail = data.user.email;

            console.log(`Authenticated as: ${data.user.username}`);

            // 전역 updateLoginUI 함수 호출 (session.js에서 window에 노출됨)
            // DOM이 준비될 때까지 대기
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    if (typeof window.updateLoginUI === 'function') {
                        window.updateLoginUI(true, data.user.username);
                    }
                });
            } else {
                // DOM이 이미 로드된 경우
                if (typeof window.updateLoginUI === 'function') {
                    window.updateLoginUI(true, data.user.username);
                }
            }

        } else {
            // 인증 실패 - 로그인 페이지로 리다이렉트
            console.log('Not authenticated. Redirecting to login page...');
            window.location.href = '/login';
        }

    } catch (error) {
        console.error('Authentication check error:', error);
        // 에러 발생 시에도 로그인 페이지로 리다이렉트
        window.location.href = '/login';
    }
})();
