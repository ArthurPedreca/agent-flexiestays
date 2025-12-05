export function useFlexiToast() {
  const toast = useToast()

  const successToast = (message: string) => {
    toast.add({
      title: 'Success',
      description: message,
      icon: 'i-lucide-check-circle',
      color: 'success',
      duration: 3000
    })
  }

  const errorToast = (message: string) => {
    toast.add({
      title: 'Error',
      description: message,
      icon: 'i-lucide-alert-circle',
      color: 'error',
      duration: 5000
    })
  }

  const infoToast = (message: string) => {
    toast.add({
      title: 'Info',
      description: message,
      icon: 'i-lucide-info',
      color: 'info',
      duration: 3000
    })
  }

  const warningToast = (message: string) => {
    toast.add({
      title: 'Warning',
      description: message,
      icon: 'i-lucide-alert-triangle',
      color: 'warning',
      duration: 4000
    })
  }

  return {
    successToast,
    errorToast,
    infoToast,
    warningToast
  }
}