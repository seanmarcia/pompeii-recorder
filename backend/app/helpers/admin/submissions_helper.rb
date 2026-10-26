module Admin
  module SubmissionsHelper
    # Renders old/new values with only the changed words wrapped for highlighting,
    # instead of coloring the entire field when just a few words differ.
    def word_diff_html(old_text, new_text)
      old_text = old_text.to_s
      new_text = new_text.to_s

      old_tokens = old_text.scan(/\S+|\s+/)
      new_tokens = new_text.scan(/\S+|\s+/)

      # Avoid the O(n*m) DP table blowing up on huge fields.
      if old_tokens.length * new_tokens.length > 4_000_000
        return [ ERB::Util.html_escape(old_text), ERB::Util.html_escape(new_text) ]
      end

      old_marked, new_marked = word_lcs_diff(old_tokens, new_tokens)

      old_html = old_marked.map { |text, status| wrap_token(text, status == :removed ? "diff-removed" : nil) }.join
      new_html = new_marked.map { |text, status| wrap_token(text, status == :added ? "diff-added" : nil) }.join

      [ old_html.html_safe, new_html.html_safe ]
    end

    private

    def wrap_token(text, css_class)
      escaped = ERB::Util.html_escape(text)
      css_class ? %(<span class="#{css_class}">#{escaped}</span>) : escaped
    end

    # Classic LCS-based diff: returns [old_tokens_tagged, new_tokens_tagged]
    # where each entry is [text, :common | :removed | :added].
    def word_lcs_diff(a, b)
      m = a.length
      n = b.length
      dp = Array.new(m + 1) { Array.new(n + 1, 0) }
      (m - 1).downto(0) do |i|
        (n - 1).downto(0) do |j|
          dp[i][j] = a[i] == b[j] ? dp[i + 1][j + 1] + 1 : [ dp[i + 1][j], dp[i][j + 1] ].max
        end
      end

      i = 0
      j = 0
      old_marked = []
      new_marked = []
      while i < m && j < n
        if a[i] == b[j]
          old_marked << [ a[i], :common ]
          new_marked << [ b[j], :common ]
          i += 1
          j += 1
        elsif dp[i + 1][j] >= dp[i][j + 1]
          old_marked << [ a[i], :removed ]
          i += 1
        else
          new_marked << [ b[j], :added ]
          j += 1
        end
      end
      while i < m
        old_marked << [ a[i], :removed ]
        i += 1
      end
      while j < n
        new_marked << [ b[j], :added ]
        j += 1
      end
      [ old_marked, new_marked ]
    end
  end
end
