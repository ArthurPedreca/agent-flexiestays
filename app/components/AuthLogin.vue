<script setup lang="ts">
const emit = defineEmits<{
  success: [token: string];
  cancel: [];
}>();

const props = defineProps<{
  inline?: boolean;
}>();

const { loginWithEmail, loginWithPhone, isLoading, isAuthenticated, token } =
  useAuth();
const { errorToast } = useFlexiToast();

const loginMethod = ref<"email" | "phone">("email");
const email = ref("");
const phoneNumber = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref("");

const isFormValid = computed(() => {
  if (loginMethod.value === "email") {
    return email.value.trim() !== "" && password.value.trim() !== "";
  }
  return phoneNumber.value.trim() !== "" && password.value.trim() !== "";
});

async function handleLogin() {
  error.value = "";

  try {
    let result;

    if (loginMethod.value === "email") {
      result = await loginWithEmail(email.value, password.value, true);
    } else {
      result = await loginWithPhone(phoneNumber.value, password.value, true);
    }

    if (result && token.value) {
      emit("success", token.value);
    }
  } catch (err: any) {
    error.value = err.message || "Login failed. Please try again.";
  }
}

function handleCancel() {
  emit("cancel");
}

onMounted(() => {
  if (isAuthenticated.value && token.value) {
    emit("success", token.value);
  }
});
</script>

<template>
  <div :class="inline ? '' : 'p-6'">
    <div class="space-y-4">
      <div class="text-center">
        <h3 class="text-lg font-semibold text-foreground">
          Login to Flexiestays
        </h3>
        <p class="text-sm text-muted-foreground mt-1">
          Sign in to continue with your booking
        </p>
      </div>

      <div class="flex rounded-lg bg-muted p-1">
        <button
          type="button"
          :class="[
            'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
            loginMethod === 'email'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="loginMethod = 'email'"
        >
          Email
        </button>
        <button
          type="button"
          :class="[
            'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
            loginMethod === 'phone'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="loginMethod = 'phone'"
        >
          Phone
        </button>
      </div>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <UFormField v-if="loginMethod === 'email'" label="Email">
          <UInput
            v-model="email"
            type="email"
            placeholder="your@email.com"
            icon="i-lucide-mail"
            size="lg"
            :disabled="isLoading"
          />
        </UFormField>

        <UFormField v-else label="Phone Number">
          <UInput
            v-model="phoneNumber"
            type="tel"
            placeholder="+44 7700 900000"
            icon="i-lucide-phone"
            size="lg"
            :disabled="isLoading"
          />
        </UFormField>

        <UFormField label="Password">
          <UInput
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Your password"
            icon="i-lucide-lock"
            size="lg"
            :disabled="isLoading"
          >
            <template #trailing>
              <UButton
                type="button"
                variant="ghost"
                color="neutral"
                size="xs"
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <div v-if="error" class="rounded-lg bg-error/10 p-3 text-sm text-error">
          {{ error }}
        </div>

        <div class="flex gap-3 pt-2">
          <UButton
            type="button"
            variant="outline"
            color="neutral"
            class="flex-1"
            :disabled="isLoading"
            @click="handleCancel"
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            color="primary"
            class="flex-1"
            :loading="isLoading"
            :disabled="!isFormValid || isLoading"
          >
            Login
          </UButton>
        </div>
      </form>

      <p class="text-center text-xs text-muted-foreground">
        By logging in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  </div>
</template>
