import { SUCCESS_CODE } from '@/constants'

const timeout = 1000

const List: {
  username: string
  role: string
  roleId: string
  permissions: string | string[]
}[] = [
  {
    username: 'admin',
    role: 'admin',
    roleId: '1',
    permissions: ['*.*.*']
  },
  {
    username: 'test',
    role: 'test',
    roleId: '2',
    permissions: ['example:dialog:create', 'example:dialog:delete']
  }
]

export default [
  // 列表接口
  {
    url: '/mock/user/list',
    method: 'get',
    response: ({ query }) => {
      const { username, pageIndex, pageSize } = query

      const mockList = List.filter((item) => {
        if (username && item.username.indexOf(username) < 0) return false
        return true
      })
      const pageList = mockList.filter(
        (_, index) => index < pageSize * pageIndex && index >= pageSize * (pageIndex - 1)
      )

      return {
        code: SUCCESS_CODE,
        data: {
          total: mockList.length,
          list: pageList
        }
      }
    }
  },
  // 模板登录已停用，避免遗留 admin/admin、test/test 与业务密码并行生效。
  {
    url: '/mock/user/login',
    method: 'post',
    timeout,
    response: () => ({
      code: 410,
      message: '模板登录接口已停用，请使用系统登录页'
    })
  },
  // 退出接口
  {
    url: '/mock/user/loginOut',
    method: 'get',
    timeout,
    response: () => {
      return {
        code: SUCCESS_CODE,
        data: null
      }
    }
  }
]
