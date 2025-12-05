# Documentação Completa do Sistema de Login/Registro - FlexieStays

Este documento fornece uma documentação detalhada e completa do sistema de autenticação (login e registro) do projeto FlexieStays, incluindo design, estrutura de arquivos, lógica de script, componentes de UI e fluxo de dados.

---

## 📁 Estrutura de Arquivos

```
app/
├── components/
│   ├── modals/
│   │   ├── LoginModal.vue           # Modal principal de login/registro
│   │   ├── RegisterModal.vue        # Modal de registro (não utilizado atualmente)
│   │   └── auth/
│   │       ├── PhoneLoginForm.vue   # Formulário de login por telefone
│   │       ├── EmailLoginForm.vue   # Formulário de login por email
│   │       ├── CreateUserForm.vue   # Formulário de criação de conta
│   │       ├── ForgotPasswordModal.vue # Modal de esqueci a senha
│   │       └── ResetPasswordModal.vue  # Modal de reset de senha
│   ├── buttons/
│   │   └── Btn.vue                  # Componente de botão reutilizável
│   └── ui/
│       ├── dialog/                  # Componentes de dialog (Reka UI)
│       ├── form/                    # Componentes de formulário (VeeValidate)
│       ├── input/                   # Componente de input
│       └── select/                  # Componentes de select
├── api/
│   └── repositories/
│       └── AuthRepository.ts        # Repositório de autenticação (API)
├── composables/
│   ├── useRecaptcha.ts              # Composable para reCAPTCHA
│   ├── useToast.ts                  # Composable para notificações toast
│   └── usePhoneFormatter.ts         # Composable para formatação de telefone
├── data/
│   └── countries.ts                 # Lista de países com códigos e máscaras
├── stores/
│   └── useAuthStore.ts              # Store de autenticação (Pinia)
├── types/
│   ├── user/
│   │   └── User.ts                  # Tipo do usuário
│   └── errors/
│       └── ApiResponseError.ts      # Tipo de erro da API
└── utils/
    ├── api/
    │   └── checkUser.ts             # Utilitário para verificar se usuário existe
    └── exceptions/
        └── getErrorMessage.ts       # Extrator de mensagens de erro
```

---

## 🎯 Visão Geral do Fluxo de Autenticação

### Fluxo de Login
```
1. Usuário abre LoginModal
2. Escolhe método: Telefone, Email ou Google
3. Se Telefone/Email:
   a. Insere dados
   b. Sistema verifica se usuário existe (checkUserExists)
   c. Se existe: Mostra campo de senha → Login
   d. Se não existe: Redireciona para CreateUserForm
4. Se Google:
   a. Redireciona para OAuth do Google
```

### Fluxo de Registro
```
1. Usuário não existe (detectado em PhoneLoginForm ou EmailLoginForm)
2. Modal muda para CreateUserForm
3. Preenche dados pessoais
4. Submete formulário
5. Conta criada → Login automático
```

---

## 🔧 Componentes Detalhados

### 1. LoginModal.vue (Modal Principal)

#### Props e Emits
```typescript
interface Props {
  variant?: "primary" | "secondary";  // Estilo do botão trigger
  open?: boolean;                     // Controle externo de abertura
  hideTrigger?: boolean;              // Esconde o botão trigger
}

interface Emits {
  (e: "update:open", value: boolean): void;    // Atualiza estado de abertura
  (e: "login-success"): void;                   // Emitido após login bem-sucedido
}
```

#### Estados Internos
```typescript
type FormMode = "phone" | "email";           // Modo do formulário de login
type ModalState = "login" | "create";        // Estado do modal

const formMode = ref<FormMode>("phone");     // Começa com login por telefone
const modalState = ref<ModalState>("login"); // Começa no estado de login
const createUserData = ref<{ email?: string; phoneNumber?: string; countryCode?: string }>({});
const isForgotPasswordModalOpen = ref(false);
```

#### Funções Principais
```typescript
// Alterna entre formulário de email e telefone
const switchToEmail = () => { formMode.value = "email"; };
const switchToPhone = () => { formMode.value = "phone"; };

// Mostra formulário de criação quando usuário não existe
const showCreateForm = (data: { email?: string; phoneNumber?: string; countryCode?: string }) => {
  createUserData.value = data;
  modalState.value = "create";
};

// Volta para tela de login
const backToLogin = () => {
  modalState.value = "login";
  createUserData.value = {};
};

// Handlers de sucesso
const handleLoginSuccess = () => {
  emit("login-success");
  emit("update:open", false);
};

const handleAccountCreated = () => {
  emit("login-success");
  emit("update:open", false);
};

// Login com Google
const handleGoogleLogin = async () => {
  window.location.href = `${baseUrl}login/google`;
};
```

#### Template Structure
```vue
<Dialog :open="open ?? false" @update:open="emit('update:open', $event)">
  <!-- Triggers (botões para abrir o modal) -->
  <DialogTrigger v-if="!hideTrigger && variant === 'primary'" ...>
    <ButtonsBtn title="Log in" variant="primary" />
  </DialogTrigger>
  <DialogTrigger v-if="!hideTrigger && variant === 'secondary'" as-child>
    <button class="...">
      <Icon name="lucide:log-in" />
      Log In
    </button>
  </DialogTrigger>

  <DialogContent class="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto sm:w-full">
    <!-- Header -->
    <DialogHeader class="relative pb-3 border-b">
      <DialogTitle class="text-center text-lg font-semibold">Log in or sign up</DialogTitle>
      <DialogDescription class="sr-only">...</DialogDescription>
    </DialogHeader>

    <div class="p-3 sm:p-4">
      <h2 class="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Welcome to Flexiestays</h2>

      <!-- Estado Login: Mostra PhoneLoginForm ou EmailLoginForm -->
      <template v-if="modalState === 'login'">
        <component
          :is="formMode === 'phone' ? PhoneLoginForm : EmailLoginForm"
          @show-create-form="showCreateForm"
          @login-success="handleLoginSuccess"
        />
      </template>

      <!-- Estado Create: Mostra CreateUserForm -->
      <CreateUserForm
        v-if="modalState === 'create'"
        :email="createUserData.email"
        :phoneNumber="createUserData.phoneNumber"
        :countryCode="createUserData.countryCode"
        @back="backToLogin"
        @account-created="handleAccountCreated"
      />

      <!-- Seção de alternativas (apenas no estado login) -->
      <template v-if="modalState === 'login'">
        <!-- Divisor "or" -->
        <div class="relative my-4 sm:my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        <!-- Botões alternativos -->
        <div class="space-y-2 sm:space-y-3">
          <Btn v-if="formMode === 'phone'" title="Continue with email" variant="secondary" icon="material-symbols:mail-outline" @click="switchToEmail" />
          <Btn v-if="formMode === 'email'" title="Continue with phone" variant="secondary" icon="material-symbols:phone-android-outline" @click="switchToPhone" />
          <Btn title="Continue with Google" variant="secondary" icon="simple-icons:google" @click="handleGoogleLogin" />
        </div>

        <!-- Link esqueci a senha -->
        <div class="mt-4 text-center">
          <button class="text-sm text-gray-600 hover:text-brand-primary underline cursor-pointer transition-colors" @click="isForgotPasswordModalOpen = true">
            Forgot your password?
          </button>
        </div>
      </template>
    </div>
  </DialogContent>
</Dialog>

<!-- Modal de Esqueci a Senha -->
<modalsAuthForgotPasswordModal v-model:open="isForgotPasswordModalOpen" @email-sent="handleForgotPasswordSuccess" />
```

---

### 2. PhoneLoginForm.vue

#### Props e Emits
```typescript
interface Props {
  mockMode?: boolean;  // Para uso em Storybook
}

const emit = defineEmits<{
  "show-create-form": [data: { email?: string; phoneNumber?: string; countryCode?: string }];
  "login-success": [];
}>();
```

#### Estados Internos
```typescript
const defaultCountry = countries.find((c) => c.code === "GB") || countries[0];
const selectedCountry = ref<Country>(defaultCountry);
const userExists = ref<boolean | null>(null);   // null = não verificado ainda
const isCheckingUser = ref(false);               // Loading ao verificar usuário
const isLoggingIn = ref(false);                  // Loading ao fazer login
const showPassword = ref(false);                 // Toggle visibilidade da senha
const showErrors = ref(false);                   // Controla exibição de erros
```

#### Schema de Validação (Zod)
```typescript
const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      phoneNumber: z
        .string()
        .min(1, "Phone number is required")
        .refine(
          (value) => validatePhoneNumber(value, selectedCountry.value),
          {
            message: `Please enter a valid phone number for ${selectedCountry.value.name}. Format: ${selectedCountry.value.example}`,
          }
        ),
      password: z.string().optional(),
    })
  )
);
```

#### Lógica de Submit
```typescript
const onSubmit = handleSubmit(
  async (formValues) => {
    // 1. Verifica se usuário existe
    await checkUser(formValues.phoneNumber);

    // 2. Se existe e tem senha, faz login
    if (userExists.value && formValues.password) {
      try {
        isLoggingIn.value = true;
        const { execute } = useRecaptcha();
        const token = await execute("submit");

        const cleanPhoneNumber = removeMask(formValues.phoneNumber);
        const fullPhoneNumber = `${selectedCountry.value.dialCode}${cleanPhoneNumber}`;

        await AuthRepository.login({
          phone_number: fullPhoneNumber,
          password: formValues.password,
          recaptcha_token: token,
        }, true);

        emit("login-success");
      } catch (error) {
        errorToast(getErrorMessage(error, "Failed to login with phone number."));
      } finally {
        isLoggingIn.value = false;
      }
    }
  },
  () => { showErrors.value = true; }  // Callback de erro de validação
);
```

#### Função checkUser
```typescript
const checkUser = async (phoneNumber: string) => {
  try {
    isCheckingUser.value = true;
    const cleanPhoneNumber = removeMask(phoneNumber);
    const fullPhoneNumber = `${selectedCountry.value.dialCode}${cleanPhoneNumber}`;
    const response = await checkUserExists(fullPhoneNumber);

    if (response?.data?.exists) {
      userExists.value = true;  // Mostra campo de senha
    } else {
      userExists.value = false;
      emit("show-create-form", { phoneNumber, countryCode: selectedCountry.value.code });
    }
  } catch (error) {
    userExists.value = false;
    emit("show-create-form", { phoneNumber, countryCode: selectedCountry.value.code });
    errorToast(getErrorMessage(error, "Failed to check user"));
  } finally {
    isCheckingUser.value = false;
  }
};
```

#### Template Structure
```vue
<form @submit="onSubmit" class="space-y-4">
  <!-- Seletor de País -->
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">Country code</label>
    <Select :model-value="selectedCountry.code" @update:model-value="onCountryChange($event)">
      <SelectTrigger class="w-full">
        <SelectValue :placeholder="`${selectedCountry.name} (${selectedCountry.dialCode})`" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="country in countries" :key="country.code" :value="country.code">
          {{ country.name }} ({{ country.dialCode }})
        </SelectItem>
      </SelectContent>
    </Select>
  </div>

  <!-- Campo de Telefone -->
  <FormField v-slot="{ componentField, errorMessage }" name="phoneNumber">
    <FormItem>
      <FormLabel>Phone number</FormLabel>
      <FormControl>
        <Input
          type="tel"
          :placeholder="selectedCountry.example"
          v-bind="componentField"
          v-maska="selectedCountry.mask"  <!-- Diretiva de máscara -->
          class="w-full"
        />
      </FormControl>
      <FormMessage v-if="showErrors && errorMessage">{{ errorMessage }}</FormMessage>
    </FormItem>
  </FormField>

  <!-- Campo de Senha (aparece apenas se userExists === true) -->
  <FormField v-if="userExists === true" v-slot="{ componentField, errorMessage }" name="password">
    <FormItem>
      <FormLabel>Password</FormLabel>
      <FormControl>
        <div class="relative">
          <Input
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter your password"
            v-bind="componentField"
            class="w-full pr-10"
          />
          <button type="button" @click="togglePasswordVisibility" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer">
            <Icon :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'" class="w-5 h-5" />
          </button>
        </div>
      </FormControl>
      <FormMessage v-if="showErrors && errorMessage">{{ errorMessage }}</FormMessage>
    </FormItem>
  </FormField>

  <!-- Texto informativo (antes de verificar usuário) -->
  <p v-if="userExists === null" class="text-xs text-gray-600">
    We'll call or text you to confirm your number. Standard message and data rates apply.
  </p>

  <!-- Botão de Submit -->
  <Btn
    :title="userExists === true ? 'Sign in' : 'Continue'"
    variant="primary"
    class="mt-6"
    type="submit"
    :icon="userExists === true ? 'material-symbols:login' : 'material-symbols:phone'"
    :loading="isCheckingUser || isLoggingIn"
  />
</form>
```

---

### 3. EmailLoginForm.vue

Estrutura muito similar ao PhoneLoginForm, mas sem seleção de país e máscara de telefone.

#### Schema de Validação
```typescript
const formSchema = toTypedSchema(
  z.object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z.string().optional(),
  })
);
```

#### Diferenças principais:
- Não tem seleção de país
- Não tem máscara (v-maska)
- Usa email em vez de phone_number
- Texto informativo diferente: "We'll email you a login link. No password needed."

---

### 4. CreateUserForm.vue (Formulário de Registro)

#### Props
```typescript
const props = withDefaults(
  defineProps<{
    email?: string;           // Email pré-preenchido (vindo do EmailLoginForm)
    phoneNumber?: string;     // Telefone pré-preenchido (vindo do PhoneLoginForm)
    countryCode?: string;     // Código do país pré-selecionado
  }>(),
  {
    email: "",
    phoneNumber: "",
    countryCode: "GB",
  }
);
```

#### Emits
```typescript
const emit = defineEmits<{
  back: [];                   // Volta para tela de login
  "account-created": [];      // Conta criada com sucesso
}>();
```

#### Schema de Validação Completo
```typescript
const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      email: z.string().email("Please enter a valid email address"),
      phone_number: z.string()
        .min(1, "Phone number is required")
        .refine(
          (value) => validatePhoneNumber(value, selectedCountry.value),
          {
            message: `Please enter a valid phone number for ${selectedCountry.value.name}. Format: ${selectedCountry.value.example}`,
          }
        ),
      password: z.string().min(8, "Password must be at least 8 characters"),
      password_confirmation: z.string(),
      birth_date: z.string().min(1, "Date of birth is required"),
    })
    .refine(
      (data) => data.password === data.password_confirmation,
      {
        message: "Passwords don't match",
        path: ["password_confirmation"],
      }
    )
  )
);
```

#### Lógica de Submit
```typescript
const onSubmit = handleSubmit(
  async (formValues) => {
    try {
      isSubmitting.value = true;

      const { execute } = useRecaptcha();
      const token = await execute("submit");

      await AuthRepository.create({
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        email: formValues.email,
        phone_number: `${selectedCountry.value.dialCode}${removeMask(formValues.phone_number)}`,
        password: formValues.password,
        password_confirmation: formValues.password_confirmation,
        birth_date: formValues.birth_date,
        ref: "",
        recaptcha_token: token,
      });

      // Eventos de analytics
      emitFbqEvent({ action: "track", value: "CompleteRegistration" });
      emitGtagEvent({ eventName: "sign_up", payload: { type: "API" } });
      
      emit("account-created");
      navigateTo("/");
    } catch (err) {
      const error = err as ApiErrorResponse;
      const message = error?.message || "Falha ao criar usuário";
      errorToast(message);

      // Mapeia erros da API para campos do formulário
      if (error?.errors) {
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.errors)) {
          mapped[field] = Array.isArray(messages) ? messages[0] ?? "" : String(messages);
        }
        form.setErrors(mapped);
        showErrors.value = true;
      }
    } finally {
      isSubmitting.value = false;
    }
  },
  () => { showErrors.value = true; }
);
```

#### Seções do Template

**1. Header com botão voltar:**
```vue
<div class="flex items-center mb-4 sm:mb-6">
  <button @click="emit('back')" class="mr-2 sm:mr-3 cursor-pointer">
    <Icon name="material-symbols:arrow-back" class="w-6 h-6 sm:w-8 sm:h-8" />
  </button>
  <h2 class="text-base sm:text-lg font-medium">Finish signing up</h2>
</div>
```

**2. Seção Legal Name:**
```vue
<div class="space-y-2 sm:space-y-3">
  <h3 class="font-medium text-sm sm:text-base">Legal name</h3>
  <!-- Campos firstName e lastName -->
  <p class="text-xs text-gray-600">Make sure this matches the name on your government ID.</p>
</div>
```

**3. Seção Date of Birth:**
```vue
<div class="space-y-2 sm:space-y-3">
  <h3 class="font-medium text-sm sm:text-base">Date of birth</h3>
  <!-- Campo birth_date type="date" -->
  <p class="text-xs text-gray-600">To sign up, you must be at least 18.</p>
</div>
```

**4. Seção Contact Info (Condicional):**
```vue
<!-- Se veio do EmailLoginForm (tem email pré-preenchido) -->
<div v-if="email">
  <!-- Email desabilitado (bg-gray-100 disabled) -->
  <!-- Seletor de país -->
  <!-- Campo de telefone -->
</div>

<!-- Se veio do PhoneLoginForm (tem phoneNumber pré-preenchido) -->
<div v-else-if="phoneNumber">
  <!-- Seletor de país -->
  <!-- Telefone desabilitado (bg-gray-100 disabled) -->
  <!-- Campo de email editável -->
</div>
```

**5. Seção Password:**
```vue
<div class="space-y-2 sm:space-y-3">
  <h3 class="font-medium text-sm sm:text-base">Password</h3>
  <!-- Campo password com toggle de visibilidade -->
  <!-- Campo password_confirmation com toggle de visibilidade -->
  <p class="text-xs text-gray-600">Password must be at least 8 characters.</p>
</div>
```

**6. Footer com termos e submit:**
```vue
<div class="pt-2 sm:pt-4">
  <p class="text-xs text-gray-600 mb-3 sm:mb-4">
    By selecting <strong>Agree and continue</strong>, I agree to Flexiestays's
    <a href="#" class="underline">Terms of Service</a>,
    <a href="#" class="underline">Payments Terms of Service</a>, and
    <a href="#" class="underline">Nondiscrimination Policy</a> and
    acknowledge the <a href="#" class="underline">Privacy Policy</a>.
  </p>

  <Btn title="Agree and continue" variant="primary" class="w-full" type="submit" :loading="isSubmitting" />

  <div class="flex items-center mt-2 sm:mt-4">
    <input type="checkbox" id="marketing" class="mr-2" />
    <label for="marketing" class="text-xs text-gray-600">I don't want to receive marketing messages</label>
  </div>
</div>
```

---

### 5. ForgotPasswordModal.vue

#### Props e Emits
```typescript
interface Props {
  open: boolean;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "email-sent"): void;
}
```

#### Schema de Validação
```typescript
const formSchema = toTypedSchema(
  z.object({
    email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  })
);
```

#### Lógica de Submit
```typescript
const onSubmit = handleSubmit(
  async (formValues) => {
    try {
      isSubmitting.value = true;
      const { execute } = useRecaptcha();
      const token = await execute("submit");

      if (!token) {
        form.setErrors({ email: "Recaptcha verification failed" });
        return;
      }

      await AuthRepository.forgotPassword({ email: formValues.email });

      const { successToast } = useToast();
      successToast("Password reset link sent! Check your email.");

      emit("email-sent");
      emit("update:open", false);
      form.resetForm();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to send password reset email");
      form.setErrors({ email: message });
    } finally {
      isSubmitting.value = false;
    }
  },
  () => { showErrors.value = true; }
);
```

---

## 🎨 Componentes UI Base

### Btn.vue (Botão)

#### Props
```typescript
interface BtnProps {
  variant: "primary" | "secondary" | "tertiary";
  title: string;
  icon?: string;           // Nome do ícone Iconify
  type?: "button" | "submit" | "reset";
  loading?: boolean;       // Mostra LoadingDots
  href?: string;           // Se presente, renderiza como NuxtLink
  name?: string;           // Atributo name do button
}
```

#### Classes por Variante
```typescript
const variantClasses = {
  primary: "bg-brand-primary hover:bg-slate-800 text-white font-bold transition-colors duration-200 rounded-lg",
  secondary: "bg-white text-gray-700 border border-brand-border rounded-lg hover:bg-gray-50",
  tertiary: "bg-brand-tertiary text-brand-primary font-bold hover:bg-teal-400 transition-colors duration-200 rounded-3xl",
};
```

#### Classes Base
```typescript
const baseClasses = "w-full py-3 px-4 text-center transition-colors duration-200 flex items-center justify-center gap-2";
```

### Dialog Components (Reka UI)

Os componentes de dialog são baseados no **Reka UI** (fork do Radix Vue):

- **Dialog**: Wrapper raiz
- **DialogTrigger**: Botão que abre o dialog
- **DialogContent**: Conteúdo do dialog com animações
- **DialogHeader**: Container do header
- **DialogTitle**: Título do dialog
- **DialogDescription**: Descrição (pode ser sr-only)
- **DialogClose**: Botão de fechar (X)
- **DialogOverlay**: Overlay escuro atrás do dialog

### Form Components (VeeValidate)

- **FormField**: Wrapper de campo com validação
- **FormItem**: Container do item do formulário
- **FormLabel**: Label do campo
- **FormControl**: Wrapper do input
- **FormMessage**: Mensagem de erro

### Input Component

Classes padrão:
```css
.input {
  height: 36px (h-9);
  width: 100%;
  border-radius: 6px (rounded-md);
  border: 1px solid var(--border-input);
  padding: 4px 12px (px-3 py-1);
  font-size: 16px (text-base) / 14px em md (md:text-sm);
  shadow: shadow-xs;
  transition: color, box-shadow;
}

.input:focus-visible {
  border-color: var(--ring);
  ring: 3px var(--ring)/50;
}

.input:invalid {
  border-color: var(--destructive);
  ring: var(--destructive)/20;
}
```

### Select Components (Reka UI)

- **Select**: Wrapper raiz
- **SelectTrigger**: Botão que abre o select
- **SelectValue**: Valor selecionado
- **SelectContent**: Container dos itens
- **SelectItem**: Item individual

---

## 🔌 Composables e Utilitários

### useRecaptcha

```typescript
export function useRecaptcha() {
  const execute = async (action: string): Promise<string> => {
    // Em desenvolvimento local, retorna token fake
    if (isDevelopment && isLocalhost) {
      return 'dev-token-' + Date.now();
    }

    // Aguarda grecaptcha carregar
    await new Promise<void>((resolve) => grecaptcha.ready(() => resolve()));
    
    return await grecaptcha.execute(siteKey, { action });
  };

  return { execute };
}
```

### useToast

```typescript
export function useToast() {
  return {
    successToast: (message: string) => toast.success(message),
    errorToast: (message: string) => toast.error(message),
    infoToast: (message: string) => toast.info(message),
    warningToast: (message: string) => toast.warning(message),
  };
}
```
Usa a biblioteca **vue-sonner** para notificações.

### usePhoneFormatter

```typescript
export const usePhoneFormatter = () => {
  // Aplica máscara de telefone
  const applyMask = (value: string, mask: string): string => { ... };
  
  // Remove caracteres não numéricos
  const removeMask = (value: string): string => value.replace(/\D/g, '');
  
  // Formata número com base no país
  const formatPhoneNumber = (value: string, country: Country): string => { ... };
  
  // Valida com regex do país
  const validatePhoneNumber = (value: string, country: Country): boolean => {
    return country.regex.test(value);
  };
  
  // Retorna máscara do país
  const getPhoneMask = (countryCode: string): string => { ... };
  
  // Cria watchers para formatação automática
  const createPhoneWatcher = (phoneRef: Ref<string>, selectedCountry: Ref<Country | null>) => { ... };
  
  // Retorna exemplo de telefone
  const getCountryExample = (countryCode: string): string => { ... };

  return { ... };
};
```

### checkUserExists (Utilitário)

```typescript
export const checkUserExists = async (identifier: string) => {
  const isEmail = (str: string) => str.includes('@') && str.includes('.');
  
  const body = isEmail(identifier)
    ? { email: identifier }
    : { phone_number: identifier };

  return await AuthRepository.checkUser(body);
};
```

### getErrorMessage (Utilitário)

```typescript
export default function getErrorMessage(err: unknown, fallback = "An unexpected error occurred"): string {
  if (!err) return fallback;
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const e = err as Record<string, any>;
    if (e?.data?.data?.message) return e.data.data.message;
    if (e?.data?.message) return e.data.message;
    if (e?.message) return e.message;
  }
  return fallback;
}
```

---

## 📡 API Repository (AuthRepository)

### Tipos

```typescript
type LoginForm = {
  password?: string;
  email?: string;
  phone_number?: string;
  recaptcha_token: string;
};

type LoginResponse = {
  access_token: string;
  expires_in?: number;
  user: User;
};

type createForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone_number: string;
  password: string;
  password_confirmation: string;
  birth_date: string;
  ref: string;
  recaptcha_token: string;
};

type createResponse = {
  message: string;
  user: User;
  token: string;
};

type CheckuserResponse = {
  exists: boolean;
};
```

### Métodos

```typescript
export const AuthRepository = {
  // Login com email/telefone + senha
  login: async (body: LoginForm, skipRedirect = false): Promise<LoginResponse | void> => {
    const response = await useBrowserPost<ApiResponse<LoginResponse>>("login", { body });
    
    // Salva token no cookie (7 dias)
    useCookie("auth_token", { maxAge: 60 * 60 * 24 * 7 }).value = response.data.access_token;
    
    // Atualiza store
    const userStore = useAuthStore();
    userStore.setUser(response.data.user || null);
    
    successToast("Logged in successfully!");
    
    if (!skipRedirect) navigateTo("/");
    return response.data;
  },

  // Criar novo usuário
  create: async (body: createForm): Promise<void> => {
    const response = await useBrowserPost<ApiResponse<createResponse>>("create-user", { body });
    
    // Salva token e atualiza store
    useCookie("auth_token", { maxAge: 60 * 60 * 24 * 7 }).value = response.data.token;
    useAuthStore().setUser(response.data.user || null);
    
    successToast("Registered successfully!");
    navigateTo("/");
  },

  // Verificar se usuário existe
  checkUser: async (body: checkUserBody): Promise<ApiResponse<CheckuserResponse>> => {
    return await useBrowserPost<ApiResponse<CheckuserResponse>>("check-user", { body });
  },

  // Logout
  logout: async (): Promise<void> => {
    await useGet<ApiResponse<logoutResponse>>("logout");
    useAuthStore().setUser(null);
    useCookie("auth_token").value = null;
    successToast("Logged out successfully!");
    navigateTo("/");
  },

  // Buscar usuário logado
  fetchUser: async (): Promise<void> => {
    const { data } = await useGet<ApiResponse<User>>("get-user");
    useAuthStore().setUser(data.value?.data || null);
  },

  // Solicitar reset de senha
  forgotPassword: async (body: { email: string }): Promise<ApiResponse<{ message: string }>> => {
    return await useBrowserPost<ApiResponse<{ message: string }>>("forgot-password", { body });
  },

  // Resetar senha
  resetPassword: async (body: { token: string; email: string; password: string; password_confirmation: string }) => {
    const response = await useBrowserPost("reset-password", { body });
    // Salva token e atualiza store automaticamente
    return response;
  },
};
```

---

## 🗄️ Store (Pinia)

### useAuthStore

```typescript
export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const isLoggedIn = computed(() => !!user.value);
  const isLoading = ref(true);

  const setUser = (newUser: User | null) => {
    user.value = newUser;
    isLoading.value = false;
  };

  return {
    user,
    isLoggedIn,
    isLoading,
    setUser,
  };
});
```

---

## 📋 Tipos TypeScript

### User

```typescript
export type User = {
  id: number;
  stripe_id: string;
  firstName: string;
  lastName: string;
  email: string;
  email_verified_at: string;
  phone_number: string;
  phone_confirmation: string;
  birthDate: string;
  last_device: string;
  picture: string;
};
```

### ApiErrorResponse

```typescript
export type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;  // Erros por campo
};
```

### Country

```typescript
export interface Country {
  name: string;         // "United Kingdom"
  code: string;         // "GB"
  dialCode: string;     // "+44"
  mask: string;         // "#### ### ####"
  regex: RegExp;        // /^\d{4} \d{3} \d{4}$/
  example: string;      // "7911 123 456"
}
```

---

## 🎨 Design System / Classes CSS

### Cores Brand
- `brand-primary`: Cor principal (botões primários)
- `brand-secondary`: Cor secundária
- `brand-tertiary`: Cor terciária
- `brand-background`: Background hover
- `brand-border`: Cor de bordas

### Spacing Responsivo
- Mobile: `p-3`, `mb-4`, `space-y-2`
- Desktop: `sm:p-4`, `sm:mb-6`, `sm:space-y-3`

### Tamanhos de Fonte
- Títulos: `text-lg` / `text-xl` / `text-2xl`
- Labels: `text-sm`
- Texto auxiliar: `text-xs text-gray-600`

### Padrões de Layout
- Modal width: `w-[95vw] max-w-md mx-auto sm:w-full`
- Max height: `max-h-[90vh] overflow-y-auto`
- Espaçamento vertical em forms: `space-y-4`

---

## 📦 Dependências Utilizadas

- **reka-ui**: Componentes de UI primitivos (Dialog, Select)
- **vee-validate**: Validação de formulários
- **@vee-validate/zod**: Integração Zod com VeeValidate
- **zod**: Schema de validação
- **vue-sonner**: Notificações toast
- **maska**: Diretiva de máscara para inputs
- **@iconify/vue**: Ícones (material-symbols, lucide, simple-icons)
- **pinia**: Store management
- **nuxt**: Framework base

---

## 🚀 Como Usar o LoginModal

### Uso Básico (com trigger interno)
```vue
<LoginModal variant="primary" />
```

### Uso Controlado (sem trigger)
```vue
<template>
  <button @click="showLogin = true">Abrir Login</button>
  <LoginModal
    v-model:open="showLogin"
    hide-trigger
    @login-success="handleSuccess"
  />
</template>

<script setup>
const showLogin = ref(false);
const handleSuccess = () => {
  // Ação após login
};
</script>
```

### Variantes do Trigger
- `variant="primary"`: Botão com estilo primário
- `variant="secondary"`: Botão com ícone e estilo inline

---

## 📝 Notas Importantes para Implementação

1. **reCAPTCHA**: Sempre usar `useRecaptcha().execute()` antes de chamadas de API sensíveis
2. **Máscaras**: Usar diretiva `v-maska` com o padrão do país selecionado
3. **Validação**: Usar `computed` para formSchema quando depende de estado reativo (ex: país selecionado)
4. **Erros da API**: Mapear `error.errors` para `form.setErrors()` para mostrar erros por campo
5. **Token**: Salvar em cookie com `maxAge: 60 * 60 * 24 * 7` (7 dias)
6. **Responsividade**: Sempre usar classes `sm:` para ajustes desktop
7. **Acessibilidade**: Usar `sr-only` para descrições de screen reader
8. **Analytics**: Emitir eventos `emitFbqEvent` e `emitGtagEvent` em ações importantes

---

Este documento contém todas as informações necessárias para replicar o sistema de autenticação do FlexieStays em qualquer outro projeto Vue/Nuxt.
