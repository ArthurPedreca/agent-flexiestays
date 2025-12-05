<script setup lang="ts">
import { countries, getCountryByCode, type Country } from "~/data/countries";

const emit = defineEmits<{ close: [boolean] }>();

const { loginWithEmail, loginWithPhone, isLoading } = useAuth();
const { errorToast } = useFlexiToast();
const {
  validatePhoneNumber,
  removeMask,
  formatPhoneNumber,
  createPhoneWatcher,
} = usePhoneFormatter();

// Default country
const defaultCountry = getCountryByCode("GB") || countries[0];

// Modal states: 'phone' | 'email' | 'register'
type ModalState = "phone" | "email" | "register";
const modalState = ref<ModalState>("phone");

// Phone login state
const selectedCountry = ref<Country>(defaultCountry);
const phoneNumber = ref("");
const phonePassword = ref("");
const showPhonePassword = ref(false);
const phoneUserExists = ref<boolean | null>(null);
const isCheckingPhoneUser = ref(false);
const phoneValidationError = ref("");
const showPhoneErrors = ref(false);

// Email login state
const email = ref("");
const emailPassword = ref("");
const showEmailPassword = ref(false);
const emailUserExists = ref<boolean | null>(null);
const isCheckingEmailUser = ref(false);

// Register state
const registerData = ref({
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  countryCode: "GB",
  birthDate: "",
  password: "",
  passwordConfirmation: "",
});
const showRegisterPassword = ref(false);
const showRegisterPasswordConfirm = ref(false);
const isRegistering = ref(false);
const noMarketing = ref(false);
const registerPhoneValidationError = ref("");
const showRegisterErrors = ref(false);

// Pre-fill data when switching to register
const prefilledEmail = ref("");
const prefilledPhone = ref("");

// Error state
const error = ref("");

// Computed for selected country in register
const registerSelectedCountry = computed(() => {
  return (
    countries.find((c) => c.code === registerData.value.countryCode) ||
    defaultCountry
  );
});

// Setup phone watchers for auto-formatting
createPhoneWatcher(phoneNumber, selectedCountry);

// Watch for register phone formatting
watch(
  () => registerData.value.phoneNumber,
  (newValue) => {
    if (!newValue || !registerSelectedCountry.value) return;
    const formatted = formatPhoneNumber(
      removeMask(newValue),
      registerSelectedCountry.value
    );
    if (formatted !== newValue) {
      registerData.value.phoneNumber = formatted;
    }
  }
);

watch(
  () => registerData.value.countryCode,
  () => {
    if (!registerData.value.phoneNumber) return;
    const numbersOnly = removeMask(registerData.value.phoneNumber);
    registerData.value.phoneNumber = formatPhoneNumber(
      numbersOnly,
      registerSelectedCountry.value
    );
  }
);

// Clear validation errors when typing
watch(phoneNumber, () => {
  phoneValidationError.value = "";
  showPhoneErrors.value = false;
});

watch(
  () => registerData.value.phoneNumber,
  () => {
    registerPhoneValidationError.value = "";
  }
);

// Validate phone and check user
async function checkPhoneUser() {
  if (!phoneNumber.value.trim()) return;

  // Validate phone format
  if (!validatePhoneNumber(phoneNumber.value, selectedCountry.value)) {
    phoneValidationError.value = `Please enter a valid phone number for ${selectedCountry.value.name}. Format: ${selectedCountry.value.example}`;
    showPhoneErrors.value = true;
    return;
  }

  try {
    isCheckingPhoneUser.value = true;
    error.value = "";
    phoneValidationError.value = "";

    const cleanPhone = removeMask(phoneNumber.value);
    const fullPhone = `${selectedCountry.value.dialCode}${cleanPhone}`;

    const { checkUserExists } = useAuth();
    const response = await checkUserExists({ phone_number: fullPhone });

    if (response?.data?.exists) {
      phoneUserExists.value = true;
    } else {
      // User doesn't exist, go to register
      prefilledPhone.value = phoneNumber.value;
      registerData.value.phoneNumber = phoneNumber.value;
      registerData.value.countryCode = selectedCountry.value.code;
      modalState.value = "register";
    }
  } catch (err: any) {
    // If error, assume user doesn't exist and go to register
    prefilledPhone.value = phoneNumber.value;
    registerData.value.phoneNumber = phoneNumber.value;
    registerData.value.countryCode = selectedCountry.value.code;
    modalState.value = "register";
  } finally {
    isCheckingPhoneUser.value = false;
  }
}

// Check if user exists (email)
async function checkEmailUser() {
  if (!email.value.trim()) return;

  try {
    isCheckingEmailUser.value = true;
    error.value = "";

    const { checkUserExists } = useAuth();
    const response = await checkUserExists({ email: email.value });

    if (response?.data?.exists) {
      emailUserExists.value = true;
    } else {
      // User doesn't exist, go to register
      prefilledEmail.value = email.value;
      registerData.value.email = email.value;
      modalState.value = "register";
    }
  } catch (err: any) {
    // If error, assume user doesn't exist and go to register
    prefilledEmail.value = email.value;
    registerData.value.email = email.value;
    modalState.value = "register";
  } finally {
    isCheckingEmailUser.value = false;
  }
}

// Login with phone
async function handlePhoneLogin() {
  if (!phoneUserExists.value) {
    await checkPhoneUser();
    return;
  }

  if (!phonePassword.value.trim()) {
    error.value = "Please enter your password";
    return;
  }

  try {
    error.value = "";
    const cleanPhone = removeMask(phoneNumber.value);
    const fullPhone = `${selectedCountry.value.dialCode}${cleanPhone}`;

    await loginWithPhone(fullPhone, phonePassword.value, true);
    emit("close", true);
  } catch (err: any) {
    error.value = err.message || "Login failed. Please check your credentials.";
  }
}

// Login with email
async function handleEmailLogin() {
  if (!emailUserExists.value) {
    await checkEmailUser();
    return;
  }

  if (!emailPassword.value.trim()) {
    error.value = "Please enter your password";
    return;
  }

  try {
    error.value = "";
    await loginWithEmail(email.value, emailPassword.value, true);
    emit("close", true);
  } catch (err: any) {
    error.value = err.message || "Login failed. Please check your credentials.";
  }
}

// Register
async function handleRegister() {
  error.value = "";
  registerPhoneValidationError.value = "";
  showRegisterErrors.value = true;

  // Validate
  if (!registerData.value.firstName.trim()) {
    error.value = "First name is required";
    return;
  }
  if (!registerData.value.lastName.trim()) {
    error.value = "Last name is required";
    return;
  }
  if (!registerData.value.birthDate) {
    error.value = "Date of birth is required";
    return;
  }
  if (!registerData.value.email.trim()) {
    error.value = "Email is required";
    return;
  }
  if (!registerData.value.phoneNumber.trim()) {
    error.value = "Phone number is required";
    return;
  }
  // Validate phone format
  if (
    !validatePhoneNumber(
      registerData.value.phoneNumber,
      registerSelectedCountry.value
    )
  ) {
    registerPhoneValidationError.value = `Please enter a valid phone number for ${registerSelectedCountry.value.name}. Format: ${registerSelectedCountry.value.example}`;
    return;
  }
  if (registerData.value.password.length < 8) {
    error.value = "Password must be at least 8 characters";
    return;
  }
  if (registerData.value.password !== registerData.value.passwordConfirmation) {
    error.value = "Passwords do not match";
    return;
  }

  try {
    isRegistering.value = true;

    const { register } = await import("~/repositories/AuthRepository");
    const { execute } = useRecaptcha();
    const recaptchaToken = await execute("register");

    const country =
      countries.find((c) => c.code === registerData.value.countryCode) ||
      defaultCountry;
    const cleanPhone = removeMask(registerData.value.phoneNumber);
    const fullPhone = `${country.dialCode}${cleanPhone}`;

    await register({
      firstName: registerData.value.firstName,
      lastName: registerData.value.lastName,
      email: registerData.value.email,
      phone_number: fullPhone,
      password: registerData.value.password,
      password_confirmation: registerData.value.passwordConfirmation,
      birth_date: registerData.value.birthDate,
      recaptcha_token: recaptchaToken,
    });

    emit("close", true);
  } catch (err: any) {
    error.value = err.message || "Registration failed. Please try again.";
  } finally {
    isRegistering.value = false;
  }
}

// Switch to email form
function switchToEmail() {
  modalState.value = "email";
  error.value = "";
}

// Switch to phone form
function switchToPhone() {
  modalState.value = "phone";
  error.value = "";
}

// Back to login from register
function backToLogin() {
  if (prefilledEmail.value) {
    modalState.value = "email";
  } else {
    modalState.value = "phone";
  }
  error.value = "";
}

// Handle cancel/close
function handleCancel() {
  emit("close", false);
}

// Handle country change
function onCountryChange(item: { label: string; value: string } | string) {
  // USelectMenu pode retornar o objeto inteiro ou apenas o value
  const code = typeof item === "string" ? item : item?.value;
  if (!code) return;

  const country = countries.find((c) => c.code === code);
  if (country) {
    selectedCountry.value = country;
    // Limpar o número de telefone ao mudar de país para aplicar a nova máscara
    phoneNumber.value = "";
    phoneValidationError.value = "";
  }
}

function onRegisterCountryChange(
  item: { label: string; value: string } | string
) {
  const code = typeof item === "string" ? item : item?.value;
  if (!code) return;

  registerData.value.countryCode = code;
  // Limpar o número de telefone ao mudar de país para aplicar a nova máscara
  if (!prefilledPhone.value) {
    registerData.value.phoneNumber = "";
    registerPhoneValidationError.value = "";
  }
}
</script>

<template>
  <UModal
    title="Log in or sign up"
    :ui="{
      footer: 'hidden',
      header: 'border-b border-gray-200 dark:border-gray-700',
      body: 'p-0',
    }"
    :close="true"
    :dismissible="true"
    @close="handleCancel"
  >
    <template #body>
      <div class="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
        <!-- Welcome Header -->
        <h2 class="text-xl sm:text-2xl font-bold mb-6">
          Welcome to Flexiestays
        </h2>

        <!-- Error Message -->
        <div
          v-if="error"
          class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
        >
          {{ error }}
        </div>

        <!-- PHONE LOGIN STATE -->
        <template v-if="modalState === 'phone'">
          <div class="space-y-4">
            <!-- Country Select -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Country code
              </label>
              <USelectMenu
                :model-value="selectedCountry.code"
                :items="
                  countries.map((c) => ({
                    label: `${c.name} (${c.dialCode})`,
                    value: c.code,
                  }))
                "
                value-key="value"
                placeholder="Select country"
                class="w-full"
                searchable
                :search-attributes="['label']"
                @update:model-value="onCountryChange"
              />
            </div>

            <!-- Phone Input -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Phone number
              </label>
              <UInput
                v-model="phoneNumber"
                type="tel"
                :placeholder="selectedCountry.example"
                size="lg"
                :disabled="isCheckingPhoneUser || isLoading"
                :color="
                  phoneValidationError && showPhoneErrors ? 'error' : undefined
                "
              />
              <p
                v-if="phoneValidationError && showPhoneErrors"
                class="mt-1 text-xs text-red-500 dark:text-red-400"
              >
                {{ phoneValidationError }}
              </p>
            </div>

            <!-- Password (only shows if user exists) -->
            <div v-if="phoneUserExists === true">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Password
              </label>
              <UInput
                v-model="phonePassword"
                :type="showPhonePassword ? 'text' : 'password'"
                placeholder="Enter your password"
                size="lg"
                :disabled="isLoading"
              >
                <template #trailing>
                  <UButton
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :icon="
                      showPhonePassword ? 'i-lucide-eye-off' : 'i-lucide-eye'
                    "
                    @click="showPhonePassword = !showPhonePassword"
                  />
                </template>
              </UInput>
            </div>

            <!-- Helper text -->
            <p
              v-if="phoneUserExists === null"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              We'll call or text you to confirm your number. Standard message
              and data rates apply.
            </p>

            <!-- Continue Button -->
            <UButton
              block
              size="lg"
              color="neutral"
              variant="solid"
              class="bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              :loading="isCheckingPhoneUser || isLoading"
              :disabled="!phoneNumber.trim()"
              @click="handlePhoneLogin"
            >
              {{ phoneUserExists === true ? "Sign in" : "Continue" }}
            </UButton>

            <!-- Divider -->
            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <div
                  class="w-full border-t border-gray-200 dark:border-gray-700"
                />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-4 bg-white dark:bg-gray-900 text-gray-500"
                  >or</span
                >
              </div>
            </div>

            <!-- Continue with Email -->
            <UButton
              block
              size="lg"
              variant="outline"
              color="neutral"
              icon="i-lucide-mail"
              @click="switchToEmail"
            >
              Continue with email
            </UButton>

            <!-- Continue with Google (placeholder) -->
            <UButton
              block
              size="lg"
              variant="outline"
              color="neutral"
              icon="i-simple-icons-google"
              disabled
            >
              Continue with Google
            </UButton>

            <!-- Forgot Password -->
            <div class="text-center">
              <button
                type="button"
                class="text-sm text-gray-600 dark:text-gray-400 underline hover:text-gray-900 dark:hover:text-white"
              >
                Forgot your password?
              </button>
            </div>
          </div>
        </template>

        <!-- EMAIL LOGIN STATE -->
        <template v-else-if="modalState === 'email'">
          <div class="space-y-4">
            <!-- Email Input -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Email address
              </label>
              <UInput
                v-model="email"
                type="email"
                placeholder="Enter your email address"
                size="lg"
                :disabled="isCheckingEmailUser || isLoading"
              />
            </div>

            <!-- Password (only shows if user exists) -->
            <div v-if="emailUserExists === true">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Password
              </label>
              <UInput
                v-model="emailPassword"
                :type="showEmailPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                size="lg"
                :disabled="isLoading"
              >
                <template #trailing>
                  <UButton
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :icon="
                      showEmailPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'
                    "
                    @click="showEmailPassword = !showEmailPassword"
                  />
                </template>
              </UInput>
            </div>

            <!-- Helper text -->
            <p
              v-if="emailUserExists === null"
              class="text-xs text-gray-500 dark:text-gray-400"
            >
              We'll email you a login link. No password needed.
            </p>

            <!-- Continue Button -->
            <UButton
              block
              size="lg"
              color="neutral"
              variant="solid"
              class="bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              icon="i-lucide-mail"
              :loading="isCheckingEmailUser || isLoading"
              :disabled="!email.trim()"
              @click="handleEmailLogin"
            >
              {{ emailUserExists === true ? "Sign in" : "Continue" }}
            </UButton>

            <!-- Divider -->
            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <div
                  class="w-full border-t border-gray-200 dark:border-gray-700"
                />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-4 bg-white dark:bg-gray-900 text-gray-500"
                  >or</span
                >
              </div>
            </div>

            <!-- Continue with Phone -->
            <UButton
              block
              size="lg"
              variant="outline"
              color="neutral"
              icon="i-lucide-phone"
              @click="switchToPhone"
            >
              Continue with phone
            </UButton>

            <!-- Continue with Google (placeholder) -->
            <UButton
              block
              size="lg"
              variant="outline"
              color="neutral"
              icon="i-simple-icons-google"
              disabled
            >
              Continue with Google
            </UButton>

            <!-- Forgot Password -->
            <div class="text-center">
              <button
                type="button"
                class="text-sm text-gray-600 dark:text-gray-400 underline hover:text-gray-900 dark:hover:text-white"
              >
                Forgot your password?
              </button>
            </div>
          </div>
        </template>

        <!-- REGISTER STATE -->
        <template v-else-if="modalState === 'register'">
          <div class="space-y-6">
            <!-- Back button -->
            <button
              type="button"
              class="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              @click="backToLogin"
            >
              <UIcon name="i-lucide-arrow-left" class="w-5 h-5" />
              <span class="font-medium">Finish signing up</span>
            </button>

            <!-- Legal Name Section -->
            <div class="space-y-3">
              <h3 class="font-medium text-gray-900 dark:text-white">
                Legal name
              </h3>
              <UInput
                v-model="registerData.firstName"
                placeholder="First name on ID"
                size="lg"
                :disabled="isRegistering"
              />
              <UInput
                v-model="registerData.lastName"
                placeholder="Last name on ID"
                size="lg"
                :disabled="isRegistering"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Make sure this matches the name on your government ID.
              </p>
            </div>

            <!-- Date of Birth Section -->
            <div class="space-y-3">
              <h3 class="font-medium text-gray-900 dark:text-white">
                Date of birth
              </h3>
              <UInput
                v-model="registerData.birthDate"
                type="date"
                size="lg"
                :disabled="isRegistering"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400">
                To sign up, you must be at least 18.
              </p>
            </div>

            <!-- Contact Info Section -->
            <div class="space-y-3">
              <h3 class="font-medium text-gray-900 dark:text-white">
                Contact info
              </h3>

              <!-- Email (disabled if prefilled from email flow) -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email address
                </label>
                <UInput
                  v-model="registerData.email"
                  type="email"
                  placeholder="Enter your email address"
                  size="lg"
                  :disabled="isRegistering || !!prefilledEmail"
                  :class="{ 'bg-gray-100 dark:bg-gray-800': !!prefilledEmail }"
                />
              </div>

              <!-- Country Select -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Country code
                </label>
                <USelectMenu
                  :model-value="registerData.countryCode"
                  :items="
                    countries.map((c) => ({
                      label: `${c.name} (${c.dialCode})`,
                      value: c.code,
                    }))
                  "
                  value-key="value"
                  placeholder="Select country"
                  class="w-full"
                  searchable
                  :search-attributes="['label']"
                  :disabled="isRegistering"
                  @update:model-value="onRegisterCountryChange"
                />
              </div>

              <!-- Phone (disabled if prefilled from phone flow) -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Phone number
                </label>
                <UInput
                  v-model="registerData.phoneNumber"
                  type="tel"
                  :placeholder="registerSelectedCountry.example"
                  size="lg"
                  :disabled="isRegistering || !!prefilledPhone"
                  :class="{ 'bg-gray-100 dark:bg-gray-800': !!prefilledPhone }"
                  :color="
                    showRegisterErrors && registerPhoneValidationError
                      ? 'error'
                      : undefined
                  "
                />
                <p
                  v-if="showRegisterErrors && registerPhoneValidationError"
                  class="mt-1 text-xs text-red-500"
                >
                  {{ registerPhoneValidationError }}
                </p>
              </div>

              <p class="text-xs text-gray-500 dark:text-gray-400">
                We'll call or text you to confirm your number. Standard message
                and data rates apply.
                <a href="#" class="underline">Privacy Policy</a>
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                We'll SMS you trip confirmations and receipts.
              </p>
            </div>

            <!-- Password Section -->
            <div class="space-y-3">
              <h3 class="font-medium text-gray-900 dark:text-white">
                Password
              </h3>
              <UInput
                v-model="registerData.password"
                :type="showRegisterPassword ? 'text' : 'password'"
                placeholder="Password"
                size="lg"
                :disabled="isRegistering"
              >
                <template #trailing>
                  <UButton
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :icon="
                      showRegisterPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'
                    "
                    @click="showRegisterPassword = !showRegisterPassword"
                  />
                </template>
              </UInput>
              <UInput
                v-model="registerData.passwordConfirmation"
                :type="showRegisterPasswordConfirm ? 'text' : 'password'"
                placeholder="Confirm password"
                size="lg"
                :disabled="isRegistering"
              >
                <template #trailing>
                  <UButton
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :icon="
                      showRegisterPasswordConfirm
                        ? 'i-lucide-eye-off'
                        : 'i-lucide-eye'
                    "
                    @click="
                      showRegisterPasswordConfirm = !showRegisterPasswordConfirm
                    "
                  />
                </template>
              </UInput>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Password must be at least 8 characters.
              </p>
            </div>

            <!-- Terms and Submit -->
            <div class="space-y-4 pt-2">
              <p class="text-xs text-gray-600 dark:text-gray-400">
                By selecting <strong>Agree and continue</strong>, I agree to
                Flexiestays's
                <a href="#" class="underline">Terms of Service</a>,
                <a href="#" class="underline">Payments Terms of Service</a>, and
                <a href="#" class="underline">Nondiscrimination Policy</a> and
                acknowledge the
                <a href="#" class="underline">Privacy Policy</a>.
              </p>

              <UButton
                block
                size="lg"
                color="neutral"
                variant="solid"
                class="bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                :loading="isRegistering"
                @click="handleRegister"
              >
                Agree and continue
              </UButton>

              <!-- Marketing checkbox -->
              <label
                class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
              >
                <input
                  v-model="noMarketing"
                  type="checkbox"
                  class="rounded border-gray-300 dark:border-gray-600"
                />
                I don't want to receive marketing messages
              </label>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>
