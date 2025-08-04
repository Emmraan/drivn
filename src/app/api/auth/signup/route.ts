import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/auth/services/authService';
import { validateName, validateEmail, validatePassword, validateConfirmPassword } from '@/utils/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, confirmPassword } = body;

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Name, email, password, and confirm password are required' },
        { status: 400 }
      );
    }

    const nameValidation = validateName(name);
    if (nameValidation) {
      return NextResponse.json(
        { success: false, message: nameValidation },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(email);
    if (emailValidation) {
      return NextResponse.json(
        { success: false, message: emailValidation },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      return NextResponse.json(
        { success: false, message: passwordValidation },
        { status: 400 }
      );
    }

    const confirmPasswordValidation = validateConfirmPassword(password, confirmPassword);
    if (confirmPasswordValidation) {
      return NextResponse.json(
        { success: false, message: confirmPasswordValidation },
        { status: 400 }
      );
    }
    

    // External strong validation
    const URL = process.env.VALIDATOR_URL;
    const API_KEY = process.env.VALIDATOR_API_KEY;

    if (process.env.VALIDATION_STRONG === 'true') {
      try {
        const validationResponse = await fetch(URL!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            validationType: 'dynamic',
            formData: {
              email,
            },
          }),
        });

        const validationResult = await validationResponse.json();

        if (
          !validationResponse.ok ||
          !validationResult.success ||
          !validationResult.valid
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                Array.isArray(validationResult.errors) &&
                validationResult.errors.length > 0 &&
                typeof validationResult.errors[0].message === 'string'
                  ? validationResult.errors[0].message
                  : 'Email failed external validation',
            },
            { status: 400 }
          );
        }
      } catch (validationError) {
        console.error('Validation API error:', validationError);
        return NextResponse.json(
          {
            success: false,
            message:
              'External email validation failed. Please try again later.',
          },
          { status: 502 }
        );
      }
    }

    const result = await AuthService.signup({
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
    });

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
