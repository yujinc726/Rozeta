"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileAudio, Loader2, Sparkles, Mail, Lock, User, CheckCircle2, ArrowRight, Eye, EyeOff } from "lucide-react"
import { auth } from "@/lib/supabase"
import { toast } from "sonner"

interface AuthPageProps {
  onSuccess: () => void
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("이메일과 비밀번호를 입력해주세요.")
      return
    }

    setLoading(true)
    try {
      const { data, error } = await auth.signIn(email, password)
      if (error) throw error
      
              toast.success("로그인되었습니다!")
      onSuccess()
    } catch (error: any) {
      console.error("Sign in error:", error)
              toast.error(error.message || "로그인에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !email || !password) {
      toast.error("모든 필수 항목을 입력해주세요.")
      return
    }

    if (password.length < 6) {
      toast.error("비밀번호는 최소 6자 이상이어야 합니다.")
      return
    }

    if (password !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.")
      return
    }

    setLoading(true)
    try {
      const { data, error } = await auth.signUp(email, password, fullName)
      if (error) throw error
      
      if (data.user && !data.user.email_confirmed_at) {
                  toast.success("회원가입이 완료되었습니다! 이메일을 확인해주세요.")
      } else {
                  toast.success("회원가입이 완료되었습니다!")
        onSuccess()
      }
    } catch (error: any) {
      console.error("Sign up error:", error)
              toast.error(error.message || "회원가입에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>
      
      {/* Floating Shapes */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-purple-300/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-300/10 to-pink-300/10 rounded-full blur-3xl"></div>
      
      {/* Main Card */}
      <Card className="relative w-full max-w-md mx-4 bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform hover:scale-110 transition-transform duration-300">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold mb-2">
            <span style={{ 
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Rozeta
            </span>
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            강의 녹음을 완벽한 노트로 변환하는 AI 서비스
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100/50 p-1">
              <TabsTrigger value="signin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">로그인</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">회원가입</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium text-gray-700">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium text-gray-700">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                    <span className="text-gray-600">로그인 상태 유지</span>
                  </label>
                  <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">비밀번호 찾기</a>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      로그인 중...
                    </>
                  ) : (
                    <>
                      로그인
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">또는</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  계정이 없으신가요?
                  <button
                    type="button"
                    onClick={() => {
                      const tabsList = document.querySelector('[role="tablist"]');
                      const signupTab = tabsList?.querySelector('[value="signup"]') as HTMLButtonElement;
                      signupTab?.click();
                    }}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    회원가입하기
                  </button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium text-gray-700">이름</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="홍길동"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                      required
                      className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-gray-700">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-gray-700">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 pl-1">최소 6자 이상의 비밀번호를 입력해주세요</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-sm font-medium text-gray-700">비밀번호 확인</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                      className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 pl-1">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      가입 중...
                    </>
                  ) : (
                    <>
                      무료로 시작하기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-gray-500 text-center">
                  가입하면 Rozeta의 <a href="#" className="text-purple-600 hover:text-purple-700">이용약관</a> 및{" "}
                  <a href="#" className="text-purple-600 hover:text-purple-700">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
                </p>
                
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  이미 계정이 있으신가요?
                  <button
                    type="button"
                    onClick={() => {
                      const tabsList = document.querySelector('[role="tablist"]');
                      const signinTab = tabsList?.querySelector('[value="signin"]') as HTMLButtonElement;
                      signinTab?.click();
                    }}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    로그인하기
                  </button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}