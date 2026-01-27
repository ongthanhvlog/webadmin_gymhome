import { TestBrowser } from '@@/testBrowser';
import { fireEvent, render, waitFor } from '@testing-library/react';
import React, { act } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
}));

/**
 * Wait for a specified time
 * @param time Time to wait (default 100ms)
 */
const waitTime = (time: number = 100) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
};

/**
 * Test login page with Firebase Authentication
 */
describe('Login Page (Firebase)', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'Test@123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display login form', async () => {
    const historyRef = React.createRef<any>();
    const rootContainer = render(
      <TestBrowser
        historyRef={historyRef}
        location={{
          pathname: '/user/login',
        }}
      />,
    );

    await rootContainer.findByPlaceholderText('Enter your email');
    await rootContainer.findByPlaceholderText('Enter your password');

    expect(
      rootContainer.baseElement?.querySelector('.ant-pro-form-login-title')
        ?.textContent,
    ).toBe('Tiến lên miền miền Nam');

    rootContainer.unmount();
  });

  it('should login successfully with Firebase', async () => {
    // Mock successful Firebase login
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: { email: testEmail },
    });

    const historyRef = React.createRef<any>();
    const rootContainer = render(
      <TestBrowser
        historyRef={historyRef}
        location={{
          pathname: '/user/login',
        }}
      />,
    );

    const emailInput = await rootContainer.findByPlaceholderText('Enter your email');
    act(() => {
      fireEvent.change(emailInput, { target: { value: testEmail } });
    });

    const passwordInput = await rootContainer.findByPlaceholderText('Enter your password');
    act(() => {
      fireEvent.change(passwordInput, { target: { value: testPassword } });
    });

    const loginBtn = await rootContainer.findByText('Đăng nhập');
    act(() => {
      fireEvent.click(loginBtn);
    });

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        testEmail,
        testPassword,
      );
    });

    // Check for redirect after successful login
    await waitTime(1000);
    expect(historyRef.current?.location.pathname).toBe('/');

    rootContainer.unmount();
  });

  it('should handle login failure with Firebase', async () => {
    // Mock failed Firebase login
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/wrong-password',
      message: 'Invalid password',
    });

    const historyRef = React.createRef<any>();
    const rootContainer = render(
      <TestBrowser
        historyRef={historyRef}
        location={{
          pathname: '/user/login',
        }}
      />,
    );

    const emailInput = await rootContainer.findByPlaceholderText('Enter your email');
    act(() => {
      fireEvent.change(emailInput, { target: { value: testEmail } });
    });

    const passwordInput = await rootContainer.findByPlaceholderText('Enter your password');
    act(() => {
      fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
    });

    const loginBtn = await rootContainer.findByText('Đăng nhập');
    act(() => {
      fireEvent.click(loginBtn);
    });

    await waitFor(() => {
      expect(rootContainer.getByText('Đăng nhập thất bại, vui lòng thử lại！'));
    });

    rootContainer.unmount();
  });
});
