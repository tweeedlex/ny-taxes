import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-lg text-muted-foreground">Page not found</p>
        <Button asChild className="mt-6">
          <Link to="/orders">Go to Orders</Link>
        </Button>
      </div>
    </div>
  )
}
